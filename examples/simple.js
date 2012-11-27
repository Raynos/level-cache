var leveldb = require("levelidb")
    , uuid = require("node-uuid")
    , cache = require("..")

var db = cache(leveldb("/tmp/db-level-cache-one", {
        createIfMissing: true
        , json: true
    }), {
        json: true
    })
    , value = uuid()

db.put("key", value)
var result = db.get("key")
console.log("value", result)
setTimeout(function () {
    db.get("key", function (err, value) {
        console.log("also persisted", value)
    })
}, 200)
