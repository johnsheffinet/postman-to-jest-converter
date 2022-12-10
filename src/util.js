const fs = require('fs');
const beautify = require('js-beautify').js

let createdFileTotal = 0

function createFile(fileWithDir, content) {
    const beautifiedData = beautify(content, {indent_size: 2, space_in_empty_paren: true})
    fs.writeFile(`${fileWithDir}`, beautifiedData, function (err) {
        if (err) {
            return console.log(err);
        }
        createdFileTotal += 1
        console.log(`${createdFileTotal} - ${fileWithDir} saved`);
    });
}

module.exports = {
    makeDirectory: (dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    },
    createTestFile: (name, content, currentDirectory) => {
        createFile(`${currentDirectory}/${name}.spec.js`, content)
    },

    createVariableFile: (rootdir) => {
        const content = `const state = {}
module.exports = {
    environment: {
        set: (key, value) => {
            state[key] = value
        },
        get: (key) => state[key],
        unset: (key) => {
          delete state[key]
        }
    }
}`
        createFile(`${rootdir}/pm.js`, content)
    },
    createRequestFile: (rootDir) => {
        const content = `const axios = require('axios')
const pm = require('./pm.js')
const globals = require('./globals')
require('dotenv-extended').load();

const variableReplaceRegex = (key) => \`{{$\{key}}}\`

function getVariable(variable) {
    if (variable === 'url_prefix'){
        return process.env.url_prefix
    }
    if (globals.hasOwnProperty(variable)) {
        return globals[variable]
    }
    if (pm.environment.get(variable)) {
        return pm.environment.get(variable)
    }
    return undefined
}

function replaceWithVariables(string) {
    if (!string) return undefined
    const variableMap = {}
    const allVariables = Array.from(string.matchAll(/{{(.*?)}}/g))

    allVariables.forEach(variable => {
        const variableName = variable[0].match(/{{(.*)}}/)[1]
        variableMap[variableName] = getVariable(variableName)
    })
    Object.keys(variableMap).forEach(key => {
        string = string.replace(variableReplaceRegex(key), variableMap[key])
    })
    return string
}

function createBodyWithVariables(data) {
    try {
        return JSON.parse(replaceWithVariables(data))
    } catch (e) {
        return undefined
    }
}

function createUrl(url) {
    if (typeof url === 'object') {
        return replaceWithVariables(url.raw)
    }
    return replaceWithVariables(url)
}


module.exports = {
    safePromise: async (axiosConfig) => {
        const config = {
            ...axiosConfig,
            url: createUrl(axiosConfig.url),
            data: createBodyWithVariables(axiosConfig.data)
        }
        console.log(config)
        const response = await axios.request(config)
        const responseBody = JSON.stringify(response.data)
        const responseCode = {
            code: response.status
        }
        return {
            responseBody,
            responseCode
        }
    },

}`
        createFile(`${rootDir}/request.js`, content)
    },
    createGlobalsFile: (rootDir, globals) => {
        const globalsMap = {}
        globals.values.forEach(({key, value}) => {
            globalsMap[key] = value
        })
        const content = JSON.stringify(globalsMap)
        createFile(`${rootDir}/globals.json`, content)
    }
}