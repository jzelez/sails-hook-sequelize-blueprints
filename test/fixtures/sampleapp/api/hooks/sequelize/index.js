module.exports = function(sails) {
  global['Sequelize'] = require('sequelize');
  //Sequelize.cls = require('continuation-local-storage').createNamespace('sails-sequelize-postgresql');
  return {
    initialize: function(next) {
      this.initAdapters();
      this.initModels();

      var connection, migrate, sequelize;
      sails.log.verbose('Using connection named ' + sails.config.models.connection);
      connection = sails.config.connections[sails.config.models.connection];
      if (connection == null) {
        throw new Error('Connection \'' + sails.config.models.connection + '\' not found in config/connections');
      }
      if (connection.options == null) {
        connection.options = {};
      }
      connection.options.logging = sails.log.verbose; //A function that gets executed everytime Sequelize would log something.

      migrate = sails.config.models.migrate;
      sails.log.verbose('Migration: ' + migrate);

      try {
        sequelize = new Sequelize(connection.database, connection.user, connection.password, connection.options);
      } catch (e) {
        console.log(e)
      }
      global['sequelize'] = sequelize;
      return sails.modules.loadModels(function(err, models) {

        var modelDef, modelName, ref;
        if (err != null) {
          return next(err);
        }
        for (modelName in models) {
          modelDef = models[modelName];
          sails.log.verbose('Loading model \'' + modelDef.globalId + '\'');
          global[modelDef.globalId] = sequelize.define(modelDef.globalId, modelDef.attributes, modelDef.options);
          sails.models[modelDef.globalId.toLowerCase()] = global[modelDef.globalId];
        }
        for (modelName in models) {
          modelDef = models[modelName];
          if (modelDef.associations != null) {
            sails.log.verbose('Loading associations for \'' + modelDef.globalId + '\'');
            if (typeof modelDef.associations === 'function') {
              modelDef.associations(modelDef);
            }
          }

          if (modelDef.defaultScope != null) {
            sails.log.verbose('Loading default scope for \'' + modelDef.globalId + '\'');
            var model = global[modelDef.globalId];
            if (typeof modelDef.defaultScope === 'function') {
              model.$scope = modelDef.defaultScope();
            }
          }
        }

        if(migrate === 'safe') {
          return next();
        } else {
          var forceSync = migrate === 'drop';
          sequelize.sync({ force: forceSync }).then(function() {
            return next();
          });
        }        
      });
    },

    initAdapters: function() {
      if(sails.adapters === undefined) {
        sails.adapters = {};
      }
    },

    initModels: function() {
      if(sails.models === undefined) {
        sails.models = {};
      }
    }
  };
};

