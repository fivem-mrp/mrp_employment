fx_version 'cerulean'
game 'gta5'

author 'mufty'
description 'MRP Employment'
version '0.0.1'

dependencies {
    "mrp_core"
}

shared_scripts {
    '@mrp_core/shared/debug.js',
    'config/config.json',
}

client_scripts {
    'client/*.js',
}

server_scripts {
    'server/*.js',
}
