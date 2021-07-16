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
    }
};

onNet('mrp:spawn', (char, spawn) => {
    MRP_CLIENT.TriggerServerCallback('mrp:employment:server:getEmployment', char._id, (employment) => {
        if (employment) {
            currentEmployment = employment;
        }
    });
});

onNet('mrp:employment:client:setEmployment', (employment) => {
    currentEmployment = employment;
});

on('mrp:employment:getSharedObject', (cb) => {
    cb(MRP_CLIENT);
});