var ReadStream = require("read-stream")
    , makeStreamData = require("level-encoding/makeStreamData")

    , getOptions = require("./getOptions")

module.exports = LevelReadStream

function LevelReadStream(db, cache, defaults) {
    return readStream

    function readStream(options) {
        if (db) {
            return db.readStream(options)
        }

        options = getOptions(defaults, options)

        var queue = ReadStream()
            , start = options.start
            , end = options.end
            , keys = Object.keys(cache.dump())

        keys.forEach(function (key) {
            if (within(key)) {
                var value = cache.get(key)
                if (value !== undefined) {
                    queue.push(makeStreamData({
                        id: key
                        , value: value
                    }, options))
                }
            }
        })

        queue.end()

        return queue.stream

        function within(key) {
            return (!start || start < key ) &&
                (!end || key < end)
        }
    }
}
