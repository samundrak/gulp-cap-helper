var inquirer = require('inquirer'),
    childProcess = require('child_process'),
    Promise = require('bluebird'),
    questions = [],
    capName,
    validate = function (value) {
        return (value && value.trim().length > 0);
    };

module.exports = function (gulp, command) {

    var deployHelper = function () {
        new Promise(function (resolve, reject) {
            new Promise(function (resolve, reject) {
                //Check if user has git username for cap
                childProcess.exec('git config user.capName', function (error, name) {
                    return error ? reject(error) : resolve(name);
                })

            }).then(function (name) {
                capName = name;
            }, function (error) {
                questions.push({
                    type: 'input',
                    name: 'username',
                    validate: validate,
                    message: 'Your username ? '
                });
            }).finally(function () {
                resolve(capName);
            });
        })
            .then(function (result) {
                questions = questions.concat([{
                    type: 'confirm',
                    name: 'isolation',
                    message: 'Want Isolation? '
                }, {
                    type: 'input',
                    name: 'branch',
                    message: 'Branch Or Tag (Leave empty to get current)? '
                }, {
                    type: 'confirm',
                    name: 'firstTime',
                    message: 'Not First time? '
                }
                ]);

                var callBack = {
                    getBranch: function (cb) {
                        return function (error, branch) {
                            return error ? console.log(error) : cb && cb(branch);
                        }
                    }
                }


                var terminalSpawn = childProcess.spawn,
                    capMonitor;
                inquirer.prompt(questions)
                    .then(function (answers) {
                        console.log('Let me cap...');

                        childProcess.exec('git rev-parse --abbrev-ref HEAD', callBack.getBranch
                        (function (branch) {

                            (!answers['branch']) && (answers['branch'] = branch);
                            var template = 'staging deploy' +
                                ' isolated=' + answers['isolation'] +
                                ' branch=' + answers['branch'].trim();

                            (!answers['firstTime']) && (template += ' agentcis:set_up');
                            template += ' user=' + (answers['username'] || capName.trim());


                            if (!capName) {
                                var capNameCreation = 'git config user.capName "' + answers['username'] + '"';
                                childProcess.exec(capNameCreation);
                            }


                            try {
                                capMonitor = terminalSpawn('cap', template.split());
                                capMonitor.stdout.on('data', function (data) {
                                    console.log(data.toString());
                                });

                                capMonitor.stdout.on('error', function (error) {
                                    console.log(error);
                                    capMonitor.kill();
                                });
                            }
                            catch (e) {
                                console.log('Unable to deploy, problem on cap');
                            }
                        }));

                    });
            }, null);
    }
    gulp.task(command || 'deploy', deployHelper);
}