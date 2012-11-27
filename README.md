# level-cache

An in memory cache on top of leveldb

## Example

Exact same API as [`levelidb`][1] and [`levelup`][2].

level-cache is one of two things. Either it's a complete in
    memory copy of the levelup API or it's a cache in front of
    leveldb.

```js
var level = require("level-cache")

var db = level()
// in memory db
```

```js
var level = require("level-cache")
    , levelup = require("levelidb")

var db = level(levelup(...))
// cache
```

`level-cache` uses `lru-cache` internally and you can pass in
    options to configure the internal cache through the API

```js
var level = require("level-cache")

var db = level(db, {
    max: 20000
    , maxAge: 5 * 1000
})
```

Level cache has a synchronious get API if you don't pass a
    callback. It will return whatever is in the cache.

```js
var level = require("level-cache")

var db = level(real_db, ...)

...

var value = db.get("key")
```

Level cache's asynchronous `get` will hit the cache by default
    and hit the real database if it doesn't have a value in the
    cache.

To get level cache to ignore it's local cache in a get just use
    the `cache: false` option

```js
var level = require("level-cache")

var db = level(real_db, ...)

...

db.get("key", { cache: false }, function (err, value) {
    // from real db
})
```

Any callbacks passed to `put`, `del` or `batch` will be passed
    through to the real leveldb and will come back from the real
    db.

```
var level = require("level-cache")

var db = level(real_db, ...)

db.put(key, value)
// real_db.put is called and `db` will emit an `"error"` event
// if real_db returns an error.

db.put(key, value, function (err) {
    // result from real db
})
```

It should be noted that the `readStream()` implementation is
    currently naive. i.e. if a real db is passed to the cache
    it will just read from the real db and bypass the cache.

level cache only uses the cache with `readStream()` if you don't
    pass in a real database.


## Kitchen sink example

```js
var level = require("level-cache")
    , toArray = require("write-stream").toArray
    , assert = require("assert")

var db = level()

db.put("foo", { hello: "world" }, function (err) {
    if (err) {
        throw err
    }

    db.get("foo", function (err, value) {
        if (err) {
            throw err
        }

        assert.equal(value.hello, "world")

        console.log("value", value)
    })
})

var ten = makeTen()

db.batch(ten, function (err) {
    if (err) {
        throw err
    }

    var stream = db.readStream({
        start: "batch:"
        , end: "batch;"
    })

    stream.pipe(toArray(function (list) {
        console.log("list", list)

        list.forEach(function (item, index) {
            assert.equal(item.key, ten[index].key)
            assert.equal(item.value, ten[index].value)
        })
    }))

    var keyStream = db.keyStream({
        start: "batch:"
        , end: "batch;"
    })

    keyStream.pipe(toArray(function (list) {
        console.log("keys", list)

        list.forEach(function (item, index) {
            assert.equal(item, ten[index].key)
        })
    }))

    var valueStream = db.valueStream({
        start: "batch:"
        , end: "batch;"
    })

    valueStream.pipe(toArray(function (list) {
        list.forEach(function (item, index) {
            assert.equal(item, ten[index].value)
        })

        console.log("values", list)
    }))
})

var writable = db.writeStream()

writable.write({ key: "write:05", value: "5" })
writable.write({ key: "write:20", value: "20" })

writable.end()
writable.on("finish", function () {
    console.log("finished writing")

    var readable = db.valueStream({
        start: "write:"
        , end: "write;"
    })

    readable.pipe(toArray(function (list) {
        assert.equal(list[0], "5")
        assert.equal(list[1], "20")
        assert.equal(list.length, 2)

        console.log("values from writeStream", list)
    }))
})

function makeTen() {
    var list = []
    for (var i = 0; i < 10; i++) {
        list.push({
            type: "put"
            , key: "batch:" + i
            , value: i
        })
    }
    return list
}
```

## Installation

`npm install level-cache`

## Contributors

 - Raynos

## MIT Licenced

  [1]: https://github.com/Raynos/levelidb
  [2]: https://github.com/rvagg/node-levelup
