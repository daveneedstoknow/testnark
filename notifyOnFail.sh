#!/bin/bash


user=$USER
job="acceptance-test"
uri="http://localhost:8080"

for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   
    echo $KEY
    case "$KEY" in
            user)              user=${VALUE} ;;
            job)    job=${VALUE} ;;
            uri)    uri=${VALUE} ;;          
            *)   
    esac    


done

echo "usage:"
echo "notifyOnFail.sh user=$USER job=acceptance-test uri=http://localhost:8080"
echo "parameters optional defaults as shown"
echo "user=${user}"
echo "job=${job}"
echo "uri=${uri}"

while :
do
	sleep 30
	lastBuild=$(curl -s "${uri}/job/${job}/lastCompletedBuild/api/json")
	status=$(echo $lastBuild | jq -r '.result')
	buildNumber=$(echo $lastBuild | jq -r '.id')
	if [[ $buildNumbers =~ "${buildNumber}" ]]; then 
		continue 
	fi

	buildNumbers="$buildNumbers $buildNumber"
	echo $buildNumbers
	wasMe=$(echo $lastBuild | jq -e ".changeSet.items[].authorEmail | match(\"${user}\")" > /dev/null && echo 0 || echo 1)
	if [ $status != "SUCCESS" ] && [ $wasMe -eq 0 ]; then
		notify-send -u critical "$job" "Build #${buildNumber} FAILED\ryou are a possible culprit\r${uri}/job/${job}/lastCompletedBuild/testReport"
	fi;

done

