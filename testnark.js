const http = require('http')

args = process.argv.slice(2);

const jenkins_url = args[0]
const BUILDS_TO_REPORT = 1 in args ? Number(args[1]) : 10
var projects = args.slice(2); 


console.log(projects + " " + BUILDS_TO_REPORT);

const RESULT_TYPE = {
  PASSED: '\x1b[32mP',
  FIXED: '\x1b[32mP',
  REGRESSION: '\x1b[31mF',
  FAILED: '\x1b[31mF',
  SKIPPED: '\x1b[32mS',
}


function dumpData(buildData) {
  console.log("RESULTS")

  byErrorCount = []
  buildData.forEach((value, key) => {
    var index = 9999999 - value['FAILED']
    var entryArray =
      typeof byErrorCount[index] === 'undefined' ? [] : byErrorCount[index]
    entryArray.push({ key: key, val: value })
    byErrorCount[index] = entryArray
  })

  byErrorCount.forEach(entrySet => {
    entrySet.forEach(entry => {
      var output = ''
      var value = entry.val
      for (
        var buildNumber = BUILDS_TO_REPORT;
        buildNumber >= 0 ;
        buildNumber--
      ) {
          var buildNumberIndex = buildNumber
          var result = (buildNumberIndex in value) ? RESULT_TYPE[value[buildNumberIndex]] : " " ;
          output += result
      }

      output += '\x1b[0m' + (" " + entry.key.split(".").slice(-2)).replace(/,/gi,".")
      console.log(output)
    })
  })
}

function addBuildData(buildData, projects, buildNumber, last) {
  

//console.log("project:" + projects[0] + " build: "+ buildNumber + " last: " + last);


  if (buildNumber < last) {	
    if (projects.length == 1)
	{
	    dumpData(buildData)
    		return
 	}

    addProject(buildData, projects.slice(1))
    return;
  }

  var url =
    jenkins_url + '/job/' +
    projects[0] +
    '/' +
    buildNumber +
    '/testReport/api/json?tree=suites[cases[className,name,status]]'


  http.get(url, res => {
    res.setEncoding('utf8')
    var body = ''
    res.on('data', data => {
      body += data
    })

    res.on('end', () => {
      var json
      try {
        json = JSON.parse(body)
        json.suites.forEach(function (suite) {
          suite.cases.forEach(function (aCase) {
            var key = aCase.className + '.' + aCase.name + " " + projects[0]
            var results
            if (buildData.has(key)) results = buildData.get(key)
            else {
              results = new Array()
              results['FAILED'] = 0
            }
            results[buildNumber-last] = aCase.status

            if (
              aCase.status != 'PASSED' &&
              aCase.status != 'FIXED' &&
              aCase.status != 'SKIPPED'
            )
		{
		
              		results['FAILED'] = results['FAILED'] + (1 + (buildNumber - last))
		}
            buildData.set(key, results)
          })
        })

      } catch (e) {
        console.log("skipping:" + buildNumber  + "E:" + e)
      }

      addBuildData(buildData, projects, buildNumber - 1, last)
    })
  })
}

function lastBuilds(buildData, projects, startBuild) {

  addBuildData(buildData, projects, startBuild, startBuild - BUILDS_TO_REPORT)
}

function addProject(buildData, projects)
{
  console.log("PROJECT:" + projects[0]);


var lastBuildNumber =
  jenkins_url + '/job/' +
  projects[0] +
  '/lastCompletedBuild/buildNumber/api/json';


http.get(lastBuildNumber, res => {
  res.setEncoding('utf8')
  var body = ''
  res.on('data', data => {
    body += data
  })

  res.on('end', () => {
    lastBuilds(buildData, projects, body)
  })
})
}

addProject(new Map(),projects);

