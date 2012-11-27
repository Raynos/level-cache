var EventEmitter = require("events").EventEmitter
    , toKeyBuffer = require("level-encoding").toKeyBuffer
    , LevelWriteStream = require("level-write-stream")
    , extend = require("xtend")
    , LRUCache = require("lru-cache")

    , LevelReadStream = require("./readStream")
    , getOptions = require("./getOptions")

    , defaultOptions = {
        max: 1000
        , maxAge: 1000 * 60 * 60
    }

module.exports = cache


/*  cache(db, { ... }, callback)
    cache(db, callback)
    cache(callback)
    cache({ ... })
    cache({ ... }, callback)

*/
function cache(db, defaults, callback) {
    var cached = new EventEmitter()
        , args = parse(db, defaults, callback) // Arguments ~_~

    callback = args[2]
    defaults = extend({}, defaultOptions, args[1])
    db = args[0]

    var cache = LRUCache(defaults)
        , readStream = LevelReadStream(db, cache, args[1])

    extend(cached, {
        put: put
        , del: del
        , get: get
        , batch: batch
        , isOpen: value(true)
        , isClosed: value(false)
        , open: open
        , close: close
        , writeStream: LevelWriteStream(cached)
        , readStream: readStream
        , keyStream: keyStream
        , valueStream: valueStream
    })

    process.nextTick(function () {
        callback && callback(cached)
        cached.emit("ready")
    })

    return cached

    function put(key, value, options, callback) {
        var _callback = cb(options, callback)
            , _options = getOptions(defaults, options)
            , _key = toKeyBuffer(key, _options)

        cache.set(_key, value)

        if (db) {
            db.put(key, value, _options, _callback || emit)
        }

        cached.emit("put", key, value)
        _callback && _callback(null)
    }

    function del(key, options, callback) {
        var _callback = cb(options, callback)
            , _options = getOptions(defaults, options)
            , _key = toKeyBuffer(key, _options)

        cache.del(_key)

        if (db) {
            db.del(key, _options, _callback || emit)
        }

        cached.emit("del", key)
        _callback && _callback(null)
    }

    function get(key, options, callback) {
        var _callback = cb(options, callback)
            , _options = getOptions(defaults, options)
            , _key = toKeyBuffer(key, _options)
            , value = cache.get(_key)

        if (_callback && value !== undefined &&
            _options.cache !== false
        ) {
            return _callback(null, value)
        }

        if (db && _callback) {
            return db.get(key, _options, _callback || emit)
        }

        return value
    }

    function batch(arr, options, callback) {
        var _callback = cb(options, callback)
            , _options = getOptions(defaults, options)

        arr.forEach(function (item) {
            var key = toKeyBuffer(item.key, _options)
                , value = item.value
                , type = item.type

            if (type === "put") {
                cache.set(key, value)
            } else if (type === "del") {
                cache.del(key)
            }
        })

        if (db) {
            db.batch(arr, _options, _callback || emit)
        }

        cached.emit("batch", arr)
        _callback && _callback(null)
    }

    function valueStream(options) {
        return readStream(extend(options || {}, {
            keys: false
            , values: true
        }))
    }

    function keyStream(options) {
        return readStream(extend(options || {}, {
            keys: true
            , values: false
        }))
    }

    function open(callback) {
        callback && callback()
    }

    function close(callback) {
        cache.reset()
        cached.emit("closed")
        callback && callback()
    }

    function emit(err) {
        if (err) {
            return cached.emit("error", err)
        }
    }
}

function cb(options, callback) {
    if (typeof options === "function") {
        return options
    }

    return callback
}

function parse(db, defaults, callback) {
    if (typeof db === "function") {
        callback = db
        db = null
        defaults = {}
    } else if (arguments.length === 1 && !db.put && !db.get) {
        defaults = db
        db = null
    } else if (arguments.length === 2 && !db.put && !db.get) {
        callback = defaults
        defaults = db
        db = null
    } else if (arguments.length === 2 &&
        typeof defaults === "function"
    ) {
        callback = defaults
        defaults = {}
    }

    defaults = defaults || {}

    return [db, defaults, callback]
}

function value(x) {
    return function constant() {
        return x
    }
}
