var extend = require("xtend")

module.exports = getOptions

function getOptions(defaults, options) {
    if (typeof options === "string") {
        options = { encoding: options }
    }

    return extend({}, defaults, options || {})
}
