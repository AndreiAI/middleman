var mongodb = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var crypto = require('crypto');
const key = 'middleman';

var url = 'mongodb://test:pass@ds129183.mlab.com:29183/middleman';

var database = function () {
    var saveUser = function (user, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('users');

            user.password = crypto.createHmac('sha256', key).update(user.password).digest('hex');

            collection.findOne({
                    email: user.email
                },
                function (err, results) {
                    if (!results) {
                        collection.insert(user);

                        return callback(true);
                    } else {
                        return callback(false);
                    }
                });
        });
    };

    var getUsers = function (filter, callback) {
        if (typeof filter.password != 'undefined') {
            filter.password = crypto.createHmac('sha256', key).update(filter.password).digest('hex');
        }

        console.log(filter);

        mongodb.connect(url, function (err, db) {
            var collection = db.collection('users');

            collection.find(filter).toArray(function (err, result) {
                return callback(result);
            });
        });
    };

    var updateUser = function (user, callback) {
        console.log('before', user);
        if (typeof user.password != 'undefined' && user.updatePassword && user.updatePassword == true) {
            user.password = crypto.createHmac('sha256', key).update(user.password).digest('hex');
        }
        console.log('after', user);

        delete user._id;

        mongodb.connect(url, function (err, db) {
            var collection = db.collection('users');

            collection.updateOne({
                email: user.email
            }, {
                '$set': user
            }, function (err, rCount, status) {
                if (err) {
                    console.log(err);

                    return callback(false);
                } else {

                    return callback(true);
                }
            });
        });
    };

    var saveProblem = function (problem, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('problems');

            collection.insert(problem, function (err, doc) {
                if (err) {
                    console.log(err);

                    return callback(false);
                } else {
                    return callback(true);
                }
            });
        });
    };

    var saveEmailProblem = function (emailProblem, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('emailProblems');

            collection.insert(emailProblem, function (err, result) {
                if (err) {
                    console.log(err);

                    return callback(result.ops[0]); // need to rethink some of the logic. Will need refactoring
                } else {
                    return callback(result.ops[0]); // sends back the problem updated
                }
            });
        });
    };

    var checkCredentials = function (email, password, done) {
        //check database

        email = email.toLowerCase();

        password = crypto.createHmac('sha256', key).update(password).digest('hex');

        mongodb.connect(url, function (err, db) {
            var collection = db.collection('users');
            collection.findOne({
                    email: email
                },
                function (err, results) {
                    if (results) {
                        if (results.password === password) {
                            var user = results;
                            done(null, user);
                        } else {
                            done(null, false);
                        }
                    } else {
                        done(null, false);
                    }
                }
            );
        });
    };

    var getProblems = function (filter, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('problems');

            collection.find(filter).toArray(function (err, result) {
                return callback(result);
            });
        });
    };

    var getEmailProblems = function (filter, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('emailProblems');

            collection.find(filter).toArray(function (err, result) {
                return callback(result);
            });
        });
    };

    var deleteEmailProblems = function (filter, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('emailProblems');

            collection.deleteMany(filter, function (err, res) {
                if (err) {
                    return callback(false);
                } else {
                    return callback(true);
                }
            })
        });
    };

    var updateProblem = function (id, update, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('problems');

            collection.updateOne({
                _id: objectId(id)
            }, {
                '$set': update
            }, function (err, rCount, status) {
                if (err) {
                    console.log(err);

                    return callback(false);
                } else {
                    return callback(true);
                }
            });
        });
    };

    var getHandlers = function (callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('users');

            collection.find({
                type: 'handler'
            }).toArray(function (err, result) {
                return callback(result);
            });
        });
    };

    var saveUpdate = function (update, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('updates');

            collection.insert(update, function (err, doc) {
                if (err) {
                    console.log(err);

                    return callback(false);
                } else {
                    return callback(true);
                }
            });
        });
    };

    var getUpdates = function (filter, callback) {
        mongodb.connect(url, function (err, db) {
            var collection = db.collection('updates');

            collection.find(filter).toArray(function (err, result) {
                return callback(result);
            });
        });
    };

    return {
        saveUser: saveUser,
        getUsers: getUsers,
        updateUser: updateUser,
        saveProblem: saveProblem,
        saveEmailProblem: saveEmailProblem,
        checkCredentials: checkCredentials,
        getProblems: getProblems,
        getEmailProblems: getEmailProblems,
        deleteEmailProblems: deleteEmailProblems,
        updateProblem: updateProblem,
        getHandlers: getHandlers,
        saveUpdate: saveUpdate,
        getUpdates: getUpdates
    }
}

module.exports = database;
