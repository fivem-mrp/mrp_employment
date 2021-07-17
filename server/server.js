const config = require('./config/config.json');

let localeConvar = GetConvar("mrp_locale", "en");
let locale = config.locale[localeConvar];

MRP_SERVER = null;

emit('mrp:getSharedObject', obj => MRP_SERVER = obj);

while (MRP_SERVER == null) {
    console.log('Waiting for shared object....');
}

function sendEmployment(src, data) {
    const agg = [{
        '$match': {
            '_id': data._id
        }
    }, {
        '$lookup': {
            'from': 'business',
            'let': {
                'eid': '$employment.business'
            },
            'pipeline': [{
                '$match': {
                    '$expr': {
                        '$in': [
                            '$_id', '$$eid'
                        ]
                    }
                }
            }],
            'as': 'businessRefs'
        }
    }];

    MRP_SERVER.aggregate('employment', agg, (employment) => {
        if (employment && employment.length > 0) {
            emitNet('mrp:employment:client:setEmployment', src, employment[0]);
        }
    });
}

/**
 * need to have module mrp_employment loaded
 * 
 * @memberof MRP_SERVER
 * @namespace employment
 */
MRP_SERVER.employment = {

    /**    
     * findEmployement - description
     * 
     * @memberof MRP_SERVER.employment
     * @param  {type} data     description     
     * @param  {type} business description     
     * @param  {type} role     description     
     * @return {type}          description     
     */
    findEmployement(data, business, role) {
        let employment;
        for (let emp of data.employment) {
            if (typeof business == 'string') {
                if (emp.business == business && (role == null || emp.role == role))
                    employment = emp;
            } else {
                if (MRP_SERVER.isObjectIDEqual(emp.business, business) && (role == null || emp.role == role))
                    employment = emp;
            }
        }
        return employment;
    },

    /**
     * removeEmployment - description    
     *      
     * @fires MRP_CLIENT.employment#mrp:employment:client:setEmployment
     * @memberof MRP_SERVER.employment
     * @param  {type} source     description     
     * @param  {type} stateId    description     
     * @param  {type} businessId description     
     * @param  {type} jobName    description     
     * @return {type}            description     
     */
    removeEmployment(source, stateId, businessId, jobName) {
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
                    console.log(`Player with state ID [${stateId}] doesn't have any jobs`);
                    return;
                } else {
                    let job = MRP_SERVER.employment.findEmployement(data, businessId, jobName);
                    if (job) {
                        let i = 0;
                        for (let obj of data.employment) {

                            let remove = false;
                            if (typeof businessId == 'string') {
                                if (obj.business == businessId && obj.role == jobName)
                                    remove = true;
                            } else {
                                if (MRP_SERVER.isObjectIDEqual(obj.business, businessId) && obj.role == jobName)
                                    remove = true;
                            }

                            if (remove) {
                                console.log(`Remove employment for stateId [${stateId}] and business [${obj.business}] with role [${obj.role}]`);
                                data.employment.splice(i, 1);
                                needUpdate = true;
                                continue;
                            }
                            i++;
                        }
                    }
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
                                locale.blSuccess.replace('${stateId}', stateId).replace('${jobName}', jobName)
                            ]
                        });

                        let allChars = MRP_SERVER.getSpawnedCharacters();
                        for (let src in allChars) {
                            let spawnedChar = allChars[src];
                            if (MRP_SERVER.isObjectIDEqual(spawnedChar._id, char._id)) {
                                if (result.upsertedId)
                                    data._id = result.upsertedId;

                                emitNet('chat:addMessage', src, {
                                    template: '<div class="chat-message nonemergency">{0}</div>',
                                    args: [
                                        locale.roleRemove.replace('${stateId}', stateId).replace('${jobName}', jobName)
                                    ]
                                });

                                sendEmployment(src, data);
                            }
                        }
                    });
                }
            });
        });
    },

    /**    
     * addEmployment - description    
     * 
     * @fires MRP_CLIENT.employment#mrp:employment:client:setEmployment
     * @memberof MRP_SERVER.employment     
     * @param  {type} source     description     
     * @param  {type} stateId    description     
     * @param  {type} businessId description     
     * @param  {type} jobName    description     
     * @return {type}            description     
     */
    addEmployment(source, stateId, businessId, jobName) {
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
                    let job = MRP_SERVER.employment.findEmployement(data, businessId, jobName);
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

                        let allChars = MRP_SERVER.getSpawnedCharacters();
                        for (let src in allChars) {
                            let spawnedChar = allChars[src];
                            if (MRP_SERVER.isObjectIDEqual(spawnedChar._id, char._id)) {
                                if (result.upsertedId)
                                    data._id = result.upsertedId;

                                emitNet('chat:addMessage', src, {
                                    template: '<div class="chat-message nonemergency">{0}</div>',
                                    args: [
                                        locale.roleAdded.replace('${stateId}', stateId).replace('${jobName}', jobName)
                                    ]
                                });

                                sendEmployment(src, data);
                            }
                        }
                    });
                }
            });
        });
    }
};

RegisterCommand('wl', (source, args) => {
    //whitelist command
    let stateId = parseInt(args[0]);
    let jobName = args[1];
    if (!stateId)
        return;
    if (!jobName)
        return;

    MRP_SERVER.employment.addEmployment(source, stateId, 'city', jobName); //not sure if we only allow city whitelist for now
}, true);

RegisterCommand('bl', (source, args) => {
    //whitelist command
    let stateId = parseInt(args[0]);
    let jobName = args[1];
    if (!stateId)
        return;
    if (!jobName)
        return;

    MRP_SERVER.employment.removeEmployment(source, stateId, 'city', jobName); //not sure if we only allow city whitelist for now
}, true);

/**
 * Get employees for a business
 * @event MRP_SERVER.employment#mrp:employment:server:getEmployees
 * @type {object}
 * @property {ID} businessId      business ID for a query
 */
onNet('mrp:employment:server:getEmployees', (source, businessId, uuid) => {
    console.log(`Get employees...`);
    const agg = [{
        '$match': {
            'employment.business': businessId
        }
    }, {
        '$lookup': {
            'from': 'character',
            'localField': 'char',
            'foreignField': '_id',
            'as': 'char'
        }
    }, {
        '$project': {
            'employment': 1,
            'char': {
                '$arrayElemAt': [
                    '$char', 0
                ]
            }
        }
    }];

    MRP_SERVER.aggregate('employment', agg, (result) => {
        console.log(`Got employees [${result.length}]`);
        if (result.length > 0) {
            for (let res of result) {
                var emp = MRP_SERVER.employment.findEmployement(res, businessId, null);
                res.employment = emp;
            }
        }
        emitNet('mrp:employment:server:getEmployees:response', source, result, uuid);
    });
});

/**
 * Get employment for a character
 * @event MRP_SERVER.employment#mrp:employment:server:getEmployment
 * @type {object}
 * @property {ID} charId      character ID to get data for
 */
onNet('mrp:employment:server:getEmployment', (source, charId, uuid) => {
    const agg = [{
        '$match': {
            'char': charId
        }
    }, {
        '$lookup': {
            'from': 'business',
            'let': {
                'eid': '$employment.business'
            },
            'pipeline': [{
                '$match': {
                    '$expr': {
                        '$in': [
                            '$_id', '$$eid'
                        ]
                    }
                }
            }],
            'as': 'businessRefs'
        }
    }];

    MRP_SERVER.aggregate('employment', agg, (result) => {
        if (result && result.length > 0) {
            emitNet('mrp:employment:server:getEmployment:response', source, result[0], uuid);
        }
    });
});

/**
 * Add employment for a character
 * @event MRP_SERVER.employment#mrp:employment:server:addEmployment
 * @type {object}
 * @property {int} stateId              stateId of the character
 * @property {ObjectID} businessId      id of the business
 * @property {string} jobName           role/job name
 */
onNet('mrp:employment:server:addEmployment', (source, stateId, businessId, jobName) => {
    MRP_SERVER.employment.addEmployment(source, stateId, businessId, jobName);
});

/**
 * Get shared object
 * @event MRP_SERVER.employment#mrp:employment:getSharedObject
 * @type {object}
 * @property {function} callback      function with the shared object as argument
 */
on('mrp:employment:getSharedObject', (cb) => {
    cb(MRP_SERVER);
});