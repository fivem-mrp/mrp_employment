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

RegisterCommand('wl', (source, args) => {
    //whitelist command
    let stateId = parseInt(args[0]);
    let jobName = args[1];
    if (!stateId)
        return;
    if (!jobName)
        return;

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
                        business: 'city', //not sure if we only allow city whitelist for now
                        role: jobName
                    }]
                };
                needUpdate = true;
            } else {
                let job = findEmployement(data, 'city', jobName);
                if (job) {
                    console.log(`Player with state ID [${stateId}] already has a job [${jobName}]`);
                    emitNet('chat:addMessage', source, {
                        template: '<div class="chat-message nonemergency">{0}</div>',
                        args: [
                            locale.errorAlreadyHasJob.replace('${stateId}', config.stateId).replace('${jobName}', config.jobName)
                        ]
                    });
                    return;
                }
            }
        });
    });
}, true);