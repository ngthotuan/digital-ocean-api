const fetch = require('node-fetch');
const fs = require('fs');

require('dotenv').config();

const { BASEURL, APIKEY } = process.env;

(function () {
    String.prototype.format = function (jsonFormat) {
        let formatted = this;
        for (let key in jsonFormat) {
            if (jsonFormat.hasOwnProperty(key)) {
                formatted = formatted.replace(
                    new RegExp(`{${key}}`, 'g'),
                    jsonFormat[key],
                );
            }
        }
        return formatted;
    };
})();


const post = async (url, body, headers) => {
    try {
        const response = await fetch(url, {
            method: 'post',
            body: JSON.stringify(body),
            headers: headers ? headers : { 'Content-Type': 'application/json' }
        });
        return await response.json();
    } catch (e) {
        console.log(e);
        return null;
    }
}

const put = async (url, body, headers) => {
    try {
        const response = await fetch(url, {
            method: 'put',
            body: JSON.stringify(body),
            headers: headers ? headers : { 'Content-Type': 'application/json' }
        });
        return await response.json();
    } catch (e) {
        console.log(e);
        return null;
    }
}

const get = async (url, type = 'html', headers) => {
    try {
        const response = await fetch(url, { headers: headers });
        let body;
        if (type === 'json') {
            body = await response.json();
        } else {
            body = await response.text();
        }
        return body;
    } catch (e) {
        console.error(e);
        return null;

    }
}

const del = async (url, headers) => {
    try {
        const response = await fetch(url, { method: 'delete', headers: headers });
        const body = await response.text();
        return body;
    } catch (e) {
        console.error(e);
        return null;

    }
}

const dGet = url => {
    return get(BASEURL + url, 'json', { 'Authorization': 'Bearer ' + APIKEY });
}
const dPost = (url, data) => {
    return post(BASEURL + url, data, { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + APIKEY });
}

const dPut = (url, data) => {
    return put(BASEURL + url, data, { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + APIKEY });
}

const dDel = url => {
    return del(BASEURL + url, { 'Authorization': 'Bearer ' + APIKEY });
}

const createDomain = async (domainName, ip) => {
    console.log(await dPost('/v2/domains', { "name": domainName, "ip_address": ip }));
    // const records = await dGet(`/v2/domains/${DOMAIN}/records`);
}

const deleteDomain = async (domainName) => {
    console.log(await dDel(`/v2/domains/${domainName}`));
}

const saveRecord = async (domain, fileName = 'records.json') => {
    const records = await dGet(`/v2/domains/${domain}/records`);
    fs.writeFileSync(fileName, JSON.stringify(records));
}

createRecord = async (domain, record) => {
    console.log(await dPost(`/v2/domains/${domain}/records`, record));
}

const createRecordFromFile = async (domain, ip, fileName) => {
    let domain_records = JSON.parse(fs.readFileSync(fileName)).domain_records;
    domain_records = domain_records.map((record) => {
        delete record['id'];
        return record;
    });
    for (let record of domain_records) {
        if (record.type === 'NS' || record.type === 'SOA') continue;
        record = JSON.parse(JSON.stringify(record).format({ domain, ip }));
        await createRecord(domain, record);
        console.log(`Created record ${record.type} - ${record.name} -> ${record.data}`);
    }
}

const deleteDuplicateRecord = async (domain, limit = 100) => {
    const records = await dGet(`/v2/domains/${domain}/records?per_page=${limit}`);

    // console.log(records);
    const id1 = records.domain_records
        .filter((record, index, self) =>
            index === self.findIndex((t) => (
                t.type === record.type && t.name === record.name && t.data === record.data
            )))
        .map(record => record.id);

    records.domain_records
        .map((record) => record.id)
        .filter(id => !id1.includes(id))
        .forEach(async id => {
            console.log(`Deletting /v2/domains/${domain}/records/${id}`);
            console.log(await dDel(`/v2/domains/${domain}/records/${id}`));
        });
}

const getRecords = async (domain, limit, type) => {
    let url = `/v2/domains/${domain}/records/?`
    if(limit && type) {
        url += `per_page=${limit}&type=${type}`;
    }
    else if(limit) {
        url += `per_page=${limit}`;
    } else if(type) {
        url += `type=${type}`;
    }
    return dGet(url);
}

const changeRecord = async (domain, id, newData) => {
    console.log(await dPut(`/v2/domains/${domain}/records/${id}`, newData));
    // {
    //     data: 'v=DKIM1; h=sha256; k=rsa; p=MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAoHzKB22hIRH6fFC5ca6TcTDVl7/0MX5jUAxe/3vMHTA2Z9+BgMJiuGvEt42Yj8QJAY+NWeKRFvQmotYtdkI4GqMIoSzqaPqJ1gDR3YLnhdfspa2kus1hl64gtFVIk4fv7aG1fha+pNxbet3yd6SKUXDaGwOirXpK+/3pr7gxDz/gv/FBAYqE+VO3X5VGNmDN6MvG/IK9MDFyXh uzdaQGjLZ/F33GH+xg/5vpOtwzaOpAAye5ubRN9C/fnJ4CLZnmCqIca0uo+acB0iY0uAQ59CFW6FgMHlZlKbVdmchrZuyH8rXLexH41GhBHPlYx0gD+LTstWRUDzuFnwf1MLUjOKz1dMp6sWJ4Pn8rZ9gxL4JBpNd3ttf6+SbuCA7DQTPOBEImyqYeyQdrrv1r1qg9SY7BASBzZC51cE4PXB9Fn702uA+Sn4lo6i/pB/D0UOA8kuebdgw0 s0j38wjLyPxquzPcjZ2UmiPgRRTR6PfjxSHFsaaSHAkzPdGo40fHhH3HmPFP4r8+57fTYzk/OzcDMNFC+YJ6RztHAfZ62Y0eZQTBWttn8nTHIfPY36nGG6sPLwyH0mWQBuK5Wcwg0ls0BqvjD97UJLMpPAMYeI8I1gxA5lZhaB9SKouVGJHLq/EKekEuYfe5JXz13viOjcgeZ/PsD3Br5evyURxPGGxNCfcCAwEAAQ=='
    // }
}

const changeRecordsIp = async (domain, newIp) => {
    const records = await getRecords(domain, 100, 'A');

    records.domain_records.forEach((record) => {
        const newData = {
            data: newIp,
        }
        changeRecord(domain, record.id, newData)
    });
}

const main = async () => {
    const DOMAIN = '04-nike.tk';
    const IP = '52.190.4.15';
    // const RECORDFILE = 'records.json'

    // await deleteDomain(DOMAIN);
    // await createDomain(DOMAIN, IP);
    // createRecordFromFile(DOMAIN, IP, RECORDFILE);

    // deleteDuplicateRecord(DOMAIN);
    changeRecordsIp(DOMAIN, IP);




}

main();


