const config = require('./config/config.json');

let localeConvar = GetConvar("mrp_locale", "en");
let locale = config.locale[localeConvar];

MRP_SERVER = null;

emit('mrp:getSharedObject', obj => MRP_SERVER = obj);

while (MRP_SERVER == null) {
    console.log('Waiting for shared object....');
}

function findEmployement(data, business, role) {
    let employment;
    for (let emp of data.employment) {
        if (emp.business == business && emp.role == role)
            employment = emp;
    }
    return employment;
}

function addEmployment(source, stateId, businessId, jobName) {
    MRP_SERVER.read('character', {
        stateId: stateId
    }, (char) => {
        if (!char) {
            emitNet('chat:addMessage', source, {
                template: '<div class="chat-message nonemergency">{0}</div>',
                args: [
                    locale.errorWLChar
                ]
            });
            console.log('Unable to find a character to whitelist');
            return;
        }

        MRP_SERVER.read('employment', {
            char: char._id
        }, (data) => {
            let needUpdate = false;
            if (!data) {
                //unemployed
                data = {
                    char: char._id,
                    employment: [{
                        business: businessId,
                        role: jobName
                    }]
                };
                needUpdate = true;
            } else {
                let job = findEmployement(data, businessId, jobName);
                if (job) {
                    console.log(`Player with state ID [${stateId}] already has a job [${jobName}]`);
                    emitNet('chat:addMessage', source, {
                        template: '<div class="chat-message nonemergency">{0}</div>',
                        args: [
                            locale.errorAlreadyHasJob.replace('${stateId}', stateId).replace('${jobName}', jobName)
                        ]
                    });
                    return;
                }

                needUpdate = true;
                data.employment.push({
                    business: businessId,
                    role: jobName
                });
            }

            if (needUpdate) {
                let query = {};

                if (data._id)
                    query._id = data._id;

                MRP_SERVER.update('employment', data, query, null, (result) => {
                    if (result.modifiedCount > 0) {
                        console.log(`Updated employment for state ID [${stateId}] with job name [${jobName}]`);
                    } else {
                        console.log(`Added employment for state ID [${stateId}] with job name [${jobName}]`);
                    }

                    emitNet('chat:addMessage', source, {
                        template: '<div class="chat-message nonemergency">{0}</div>',
                        args: [
                            locale.wlSuccess.replace('${stateId}', stateId).replace('${jobName}', jobName)
                        ]
                    });
                });
            }
        });
    });
}

RegisterCommand('wl', (source, args) => {
    //whitelist command
    let stateId = parseInt(args[0]);
    let jobName = args[1];
    if (!stateId)
        return;
    if (!jobName)
        return;

    addEmployment(source, stateId, 'city', jobName); //not sure if we only allow city whitelist for now
}, true);