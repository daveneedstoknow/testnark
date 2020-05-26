const http = require('http')

args = process.argv.slice(2);

const jenkins_url = args[0]
const project = 1 in args ? args[1] : 'acceptance-test' 
const BUILDS_TO_REPORT = 2 in args ? Number(args[2]) : 10

console.log(project + " " + BUILDS_TO_REPORT);

const lastBuildNumber =
  jenkins_url + '/job/' +
  project +
  '/lastCompletedBuild/buildNumber/api/json'


const RESULT_TYPE = {
  PASSED: '\x1b[32mpass',
  FIXED: '\x1b[32mpass',
  REGRESSION: '\x1b[31mFAIL',
  FAILED: '\x1b[31mFAIL',
  SKIPPED: '\x1b[32mskip',
}

function mapElement(value, key, map) {
  if (value['FAILED'] > 0) console.log(key + ':' + value['FAILED'])
}

function padBuildNumber(number) {
  if (number <= 999999) {
    number = ('00000' + number).slice(-6)
  }
  return number
}

function dumpData(buildData, oldestBuildNumber) {
  byErrorCount = []
  buildData.forEach((value, key) => {
    var index = 9999999 - value['FAILED']
    var entryArray =
      typeof byErrorCount[index] === 'undefined' ? [] : byErrorCount[index]
    //delete value["FAILED"]
    entryArray.push({ key: key, val: value })
    byErrorCount[index] = entryArray
  })

	var headings = "";
  for (
        var buildNumber = oldestBuildNumber + BUILDS_TO_REPORT;
        buildNumber >= oldestBuildNumber ;
        buildNumber--
      ) {
		headings += padBuildNumber(buildNumber) + " ";

	}
		console.log(headings);

  byErrorCount.forEach(entrySet => {
    entrySet.forEach(entry => {
      var output = ''
      var value = entry.val
      for (
        var buildNumber = oldestBuildNumber + BUILDS_TO_REPORT;
        buildNumber >= oldestBuildNumber ;
        buildNumber--
      ) {
          var buildNumberIndex = padBuildNumber(buildNumber)
          var result = (buildNumberIndex in value) ? RESULT_TYPE[value[buildNumberIndex]] : "    " ;
          output += ' ' + result + '  '
      }

      output += '\x1b[0m' + entry.key
      console.log(output)
    })
  })
}

function addBuildData(buildData, buildNumber, last) {
  var url =
    jenkins_url + '/job/' +
    project +
    '/' +
    buildNumber +
    '/testReport/api/json?tree=suites[cases[className,name,status]]'

  if (buildNumber < last) {
    dumpData(buildData, last)
    return
  }
  //console.log(url)

  http.get(url, res => {
    res.setEncoding('utf8')
    var body = ''
    res.on('data', data => {
      body += data
    })

    res.on('end', () => {
      //console.log('end: ' + buildNumber)
      //	console.log(body);
      var json
      try {
        json = JSON.parse(body)
        json.suites.forEach(function (suite) {
          suite.cases.forEach(function (aCase) {
            var key = aCase.className + '.' + aCase.name
            var results
            if (buildData.has(key)) results = buildData.get(key)
            else {
              results = new Array()
              results['FAILED'] = 0
            }
            results[padBuildNumber(buildNumber)] = aCase.status

            if (
              aCase.status != 'PASSED' &&
              aCase.status != 'FIXED' &&
              aCase.status != 'SKIPPED'
            )
              results['FAILED'] = results['FAILED'] + (buildNumber - last)

            buildData.set(key, results)
          })
        })
        console.log('processed:' + buildNumber)
      } catch (e) {
        console.log("skipping:" + buildNumber)
      }

      addBuildData(buildData, buildNumber - 1, last)
    })
  })
}

function lastBuilds(startBuild) {
  var buildData = new Map()
  addBuildData(buildData, startBuild, startBuild - BUILDS_TO_REPORT)
}

http.get(lastBuildNumber, res => {
  res.setEncoding('utf8')
  var body = ''
  res.on('data', data => {
    body += data
  })

  res.on('end', () => {
    lastBuilds(body)
  })
})

