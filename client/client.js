eval(LoadResourceFile('mrp_core', 'client/helpers.js'));

const configFile = LoadResourceFile(GetCurrentResourceName(), 'config/config.json');

const config = JSON.parse(configFile);

const localeConvar = GetConvar("mrp_locale", "en");
const locale = config.locale[localeConvar];

MRP_CLIENT = null;

emit('mrp:getSharedObject', obj => MRP_CLIENT = obj);

while (MRP_CLIENT == null) {
    console.log('Waiting for shared object....');
}

let currentEmployment = undefined;

/**
 * need to have module mrp_employment loaded
 * 
 * @memberof MRP_CLIENT
 * @namespace employment
 */
MRP_CLIENT.employment = {

    /**
     * city business name    
     */
    CITY: 'city',

    /**    
     * city judge role name    
     */
    ROLE_JUDGE: 'judge',

    /**    
     * city mayor role name
     */
    ROLE_MAYOR: 'mayor',

    /**
     * findEmployement - description    
     *      
     * @memberof MRP_CLIENT.employment
     * @param  {type} business                 description     
     * @param  {type} role                     description     
     * @param  {type} data = currentEmployment description     
     * @return {type}                          description     
     */
    findEmployement(business, role, data = currentEmployment) {
        let employment;

        if (!data || !data.employment)
            return employment;

        for (let emp of data.employment) {
            if (typeof business == 'string') {
                if (emp.business == business && emp.role == role)
                    employment = emp;
            } else {
                if (utils.isObjectIDEqual(emp.business, business) && emp.role == role)
                    employment = emp;
            }
        }
        return employment;
    },

    /**
     * hasRole - description    
     *      
     * @memberof MRP_CLIENT.employment
     * @param  {type} business                 description     
     * @param  {type} role                     description     
     * @param  {type} data = currentEmployment description     
     * @return {type}                          description     
     */
    hasRole(business, role, data = currentEmployment) {
        if (MRP_CLIENT.employment.findEmployement(business, role, data))
            return true;

        return false;
    },

    /**
     * getEmployment - description    
     * 
     * @memberof MRP_CLIENT.employment
     * @return {type}  description     
     */
    getEmployment() {
        return currentEmployment;
    },

    /**
     * getRole - description    
     *      
     * @memberof MRP_CLIENT.employment
     * @param  {type} business description     
     * @param  {type} role     description     
     * @return {type}          description     
     */
    getRole(business, role) {
        let foundRole = undefined;

        if (currentEmployment && currentEmployment.businessRefs) {
            for (let business of currentEmployment.businessRefs) {
                if (utils.isObjectIDEqual(business._id, business) && business.roles) {
                    for (let r of business.roles) {
                        if (r.name == role) {
                            foundRole = r;
                            break;
                        }
                    }
                }
            }
        }

        return foundRole;
    },

    /**
     * getBusiness - description    
     * 
     * @memberof MRP_CLIENT.employment
     * @param  {type} business description     
     * @return {type}          description     
     */
    getBusiness(business) {
        let foundBusiness = undefined;

        if (currentEmployment && currentEmployment.businessRefs) {
            for (let business of currentEmployment.businessRefs) {
                if (utils.isObjectIDEqual(business._id, business)) {
                    foundBusiness = r;
                    break;
                }
            }
        }

        return foundRole;
    }
};

on('onClientResourceStart', (name) => {
    if (name != GetCurrentResourceName())
        return;

    let char = MRP_CLIENT.GetPlayerData();
    if (char) {
        //try to get employment
        MRP_CLIENT.TriggerServerCallback('mrp:employment:server:getEmployment', char._id, (employment) => {
            if (employment) {
                currentEmployment = employment;
            }
        });
    }
});

/**
 * init employment on spawn
 * @listens MRP_CLIENT#mrp:spawn
 */
onNet('mrp:spawn', (char, spawn) => {
    MRP_CLIENT.TriggerServerCallback('mrp:employment:server:getEmployment', char._id, (employment) => {
        if (employment) {
            currentEmployment = employment;
        }
    });
});

/**
 * Set employment data event
 * @event MRP_CLIENT.employment#mrp:employment:client:setEmployment
 * @type {object}
 * @property {Employment} employment      employment to set
 */
onNet('mrp:employment:client:setEmployment', (employment) => {
    console.log(`Update employment ${JSON.stringify(employment)}`);
    currentEmployment = employment;
});

/**
 * Update employment data event
 * @event MRP_CLIENT.employment#mrp:employment:client:update
 * @type {object}
 */
on('mrp:employment:client:update', () => {
    let char = MRP_CLIENT.GetPlayerData();
    if (char) {
        //try to get employment
        MRP_CLIENT.TriggerServerCallback('mrp:employment:server:getEmployment', char._id, (employment) => {
            if (employment) {
                currentEmployment = employment;
            }
        });
    }
});

/**
 * Get shared object
 * @event MRP_CLIENT.employment#mrp:employment:getSharedObject
 * @type {object}
 * @property {function} callback      function with the shared object as argument
 */
on('mrp:employment:getSharedObject', (cb) => {
    cb(MRP_CLIENT);
});