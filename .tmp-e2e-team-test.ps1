$ErrorActionPreference='Stop'
$api='https://pbl-lms-backend.onrender.com/api'
$pwd='Mad0.2oo1'
$accounts=@(
  @{ email='maaadooo2001@gmail.com' },
  @{ email='maaadooo.2001@gmail.com' },
  @{ email='maaadooo20.01@gmail.com' }
)
function Login($email,$password){
  $body=@{email=$email;password=$password}|ConvertTo-Json
  $r=Invoke-RestMethod -Uri "$api/auth/login" -Method Post -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body))
  return $r.data.token
}
function GetJ($url,$token){ Invoke-RestMethod -Uri $url -Headers @{Authorization="Bearer $token"} }
function PostJ($url,$token,$obj){
  $json=$obj|ConvertTo-Json -Depth 15
  Invoke-RestMethod -Uri $url -Method Post -Headers @{Authorization="Bearer $token";'Content-Type'='application/json; charset=utf-8'} -Body ([Text.Encoding]::UTF8.GetBytes($json))
}
$session=@{}
foreach($a in $accounts){
  $tok=Login $a.email $pwd
  $me=GetJ "$api/auth/me" $tok
  $session[$a.email]=[PSCustomObject]@{ token=$tok; userId=[string]$me.data._id; name=$me.data.name }
  Write-Output "LOGIN_OK $($a.email) userId=$([string]$me.data._id)"
}
$tokenAny=$session[$accounts[0].email].token
$team=(GetJ "$api/teams/my-team" $tokenAny).data
$teamId=[string]$team._id
$enroll=(GetJ "$api/team-projects/team/$teamId" $tokenAny).data | Where-Object { $_.project -and ($_.project._id -or $_.project) } | Select-Object -First 1
$projectId=[string]$enroll.project._id
if(-not $projectId){ $projectId=[string]$enroll.project }
$roleToken=@{}
foreach($mr in $enroll.memberRoles){
  $uid=[string]$mr.user
  $role=[string]$mr.role
  $email = ($session.Keys | Where-Object { $session[$_].userId -eq $uid } | Select-Object -First 1)
  if($email){ $roleToken[$role] = $session[$email].token; Write-Output "ROLE_MAP role=$role email=$email" }
}
$designerToken=$roleToken['system_designer']
$hardwareToken=$roleToken['hardware_engineer']
$testerToken=$roleToken['tester']
if(-not $designerToken -or -not $hardwareToken -or -not $testerToken){ throw 'Role token mapping failed' }
$wokwi='https://wokwi.com/projects/460301003444844545'
$results=New-Object System.Collections.ArrayList
function TryStage($step,$token,$payload){
  try{
    $r=PostJ "$api/team-submissions/wokwi" $token $payload
    $null=$results.Add([PSCustomObject]@{step=$step; ok=$true; status=201; message='success'; id=[string]$r.data._id; stage=[string]$r.data.stageKey })
  } catch {
    $resp=$_.Exception.Response
    if($resp){
      $reader=New-Object IO.StreamReader($resp.GetResponseStream())
      $null=$results.Add([PSCustomObject]@{step=$step; ok=$false; status=$resp.StatusCode.value__; message=$reader.ReadToEnd(); id=''; stage='' })
    } else {
      $null=$results.Add([PSCustomObject]@{step=$step; ok=$false; status='ERR'; message=$_.Exception.Message; id=''; stage='' })
    }
  }
}
TryStage 'design/by-designer' $designerToken @{ teamId=$teamId; projectId=$projectId; stageKey='design'; wokwiLink=$wokwi; notes='E2E design'; designNarrative='تصميم نظام استجابة لزر المستخدم مع تبديل LED عند كل ضغطة.' }
TryStage 'wiring/by-hardware' $hardwareToken @{ teamId=$teamId; projectId=$projectId; stageKey='wiring'; wokwiLink=$wokwi; notes='E2E wiring'; wiringDiagramDetails='D2 زر إدخال + مقاومة سحب لأسفل D13 LED + مقاومة 220 أوم وأرضي مشترك.' }
TryStage 'programming/by-designer' $designerToken @{ teamId=$teamId; projectId=$projectId; stageKey='programming'; wokwiLink=$wokwi; notes='E2E p1'; programmingCode='int b=2,l=13;bool s=0,p=0;void setup(){pinMode(b,INPUT);pinMode(l,OUTPUT);}void loop(){bool n=digitalRead(b);if(n&&!p){s=!s;}digitalWrite(l,s);p=n;delay(25);}' }
TryStage 'programming/by-hardware' $hardwareToken @{ teamId=$teamId; projectId=$projectId; stageKey='programming'; wokwiLink=$wokwi; notes='E2E p2'; programmingCode='const byte btn=2,led=13;bool st=false,last=false;void setup(){pinMode(btn,INPUT);pinMode(led,OUTPUT);}void loop(){bool cur=digitalRead(btn);if(cur&&!last){st=!st;}digitalWrite(led,st);last=cur;delay(20);}' }
TryStage 'programming/by-tester' $testerToken @{ teamId=$teamId; projectId=$projectId; stageKey='programming'; wokwiLink=$wokwi; notes='E2E p3'; programmingCode='byte b=2,L=13;bool on=false,prev=false;void setup(){pinMode(b,INPUT);pinMode(L,OUTPUT);}void loop(){bool c=digitalRead(b);if(c&&!prev){on=!on;}digitalWrite(L,on);prev=c;delay(30);}' }
TryStage 'testing/by-tester' $testerToken @{ teamId=$teamId; projectId=$projectId; stageKey='testing'; wokwiLink=$wokwi; notes='E2E testing'; testingReport='تم اختبار الضغط الفردي والمتكرر التبديل يعمل بثبات ولا يوجد اهتزاز ملحوظ بعد التأخير.' }
TryStage 'final_delivery/by-tester' $testerToken @{ teamId=$teamId; projectId=$projectId; stageKey='final_delivery'; wokwiLink=$wokwi; notes='E2E final' }
$progress=(GetJ "$api/team-submissions/progress/$teamId/$projectId" $testerToken).data
$history=(GetJ "$api/team-submissions/wokwi/$teamId/$projectId" $testerToken)
Write-Output "TEAM_ID=$teamId PROJECT_ID=$projectId"
$results | ForEach-Object { Write-Output ("STEP={0} | OK={1} | STATUS={2} | STAGE={3} | MSG={4}" -f $_.step,$_.ok,$_.status,$_.stage,$_.message) }
Write-Output ("PROGRESS_COMPLETED=" + ($progress.completed | ConvertTo-Json -Compress))
Write-Output ("PROGRAMMING=" + $progress.programmingSubmittedCount + "/" + $progress.programmingRequiredCount)
Write-Output ("HISTORY_COUNT=" + $history.count)
