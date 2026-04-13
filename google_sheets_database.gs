// ============================================================
// PRO EXAM v12 — Google Sheets Database Script
// 3 sahifa: CloudDB | Leaderboard | Logs
// O'rnatish: Extensions > Apps Script > paste > Run setupDatabase
//            Deploy > New deployment > Web App > Anyone > Deploy
//            URL → script.js DB_URL ga qo'ying
// ============================================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// MAIN ROUTER
// ============================================================
function doGet(e) {
  try {
    const p = e.parameter || {};
    const action = p.action || 'get';
    if (action === 'get') {
      if (!p.key) return jsonResponse({error:'Key required'});
      return jsonResponse(cloudDBGet(p.key));
    }
    if (action === 'leaderboard_top') return jsonResponse(getLeaderboard(parseInt(p.limit)||20));
    if (action === 'logs') return jsonResponse(getLogs(parseInt(p.limit)||50));
    if (action === 'stats') {
      if (!p.user) return jsonResponse({error:'User required'});
      return jsonResponse(cloudDBGet('stats_'+p.user));
    }
    return jsonResponse({error:'Unknown GET action'});
  } catch(err) { return jsonResponse({error:err.toString()}); }
}

function doPost(e) {
  try {
    let data;
    try { data = JSON.parse(e.postData.contents); }
    catch(pe) { return jsonResponse({error:'Invalid JSON'}); }
    const action = data.action || 'set';
    if (action === 'set') {
      if (!data.key) return jsonResponse({error:'Key required'});
      cloudDBSet(data.key, data.value);
      return jsonResponse({success:true, key:data.key});
    }
    if (action === 'leaderboard') { saveLeaderboardEntry(data); return jsonResponse({success:true}); }
    if (action === 'log') { saveLog(data); return jsonResponse({success:true}); }
    if (action === 'check_block') return jsonResponse({blocked:false});
    return jsonResponse({error:'Unknown action: '+action});
  } catch(err) { return jsonResponse({error:err.toString()}); }
}

// ============================================================
// 1. CLOUDDB — Key-Value
// ============================================================
function getCloudDBSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName('CloudDB');
  if (!s) {
    s = ss.insertSheet('CloudDB');
    s.getRange(1,1,1,4).setValues([['Key','Value','UpdatedAt','Size']]);
    s.getRange(1,1,1,4).setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFF').setFontSize(11);
    s.setColumnWidth(1,240); s.setColumnWidth(2,500); s.setColumnWidth(3,180); s.setColumnWidth(4,80);
    s.freezeRows(1); s.getRange(1,1,1,4).createFilter();
  }
  return s;
}

function cloudDBGet(key) {
  if (!key) return {value:null};
  const s=getCloudDBSheet(); const data=s.getDataRange().getValues();
  for (let i=1;i<data.length;i++) {
    if (String(data[i][0])===String(key)) return {key:data[i][0],value:data[i][1],updatedAt:data[i][2]};
  }
  return {key:key,value:null};
}

function cloudDBSet(key, value) {
  if (!key) return;
  const s=getCloudDBSheet(); const data=s.getDataRange().getValues();
  const now=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"dd.MM.yyyy HH:mm:ss");
  const size=String(value).length;
  for (let i=1;i<data.length;i++) {
    if (String(data[i][0])===String(key)) {
      s.getRange(i+1,2,1,3).setValues([[value,now,size]]);
      s.getRange(i+1,1,1,4).setBackground('#E8F5E9');
      return;
    }
  }
  const lr=s.getLastRow()+1;
  s.getRange(lr,1,1,4).setValues([[key,value,now,size]]);
  s.getRange(lr,1,1,4).setBackground('#F3F8FF');
}

// ============================================================
// 2. LEADERBOARD — Test natijalari
// ============================================================
function getLeaderboardSheet() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let s=ss.getSheetByName('Leaderboard');
  if (!s) {
    s=ss.insertSheet('Leaderboard');
    s.getRange(1,1,1,7).setValues([['#','Talaba','Ball (%)','Fan','Rejim','Sana',"Qo'shimcha"]]);
    s.getRange(1,1,1,7).setFontWeight('bold').setBackground('#1B5E20').setFontColor('#FFF').setFontSize(11);
    s.setColumnWidth(1,50);s.setColumnWidth(2,160);s.setColumnWidth(3,90);
    s.setColumnWidth(4,200);s.setColumnWidth(5,220);s.setColumnWidth(6,170);s.setColumnWidth(7,180);
    s.freezeRows(1); s.getRange(1,1,1,7).createFilter();
    const sr=s.getRange('C2:C5000');
    s.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(90).setBackground('#C8E6C9').setFontColor('#1B5E20').setRanges([sr]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(70,89).setBackground('#FFF9C4').setFontColor('#F57F17').setRanges([sr]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(70).setBackground('#FFCDD2').setFontColor('#B71C1C').setRanges([sr]).build()
    ]);
  }
  return s;
}

function saveLeaderboardEntry(data) {
  const s=getLeaderboardSheet();
  const now=Utilities.formatDate(data.date?new Date(data.date):new Date(),Session.getScriptTimeZone(),"dd.MM.yyyy HH:mm");
  const lr=s.getLastRow()+1;
  s.getRange(lr,1,1,7).setValues([[lr-1,data.user||'Unknown',data.score||0,data.subject||'—',data.mode||'—',now,data.extra||'']]);
  const sc=parseInt(data.score)||0;
  s.getRange(lr,1,1,7).setBackground(sc>=90?'#E8F5E9':sc>=70?'#FFFDE7':'#FFEBEE');
  sortLeaderboard();
}

function sortLeaderboard() {
  const s=getLeaderboardSheet(); const lr=s.getLastRow();
  if(lr<=2)return;
  s.getRange(2,1,lr-1,7).sort({column:3,ascending:false});
  for(let i=2;i<=lr;i++) s.getRange(i,1).setValue(i-1);
}

function getLeaderboard(limit) {
  const s=getLeaderboardSheet(); const data=s.getDataRange().getValues();
  const max=Math.min(data.length-1,limit||20); const result=[];
  for(let i=1;i<=max;i++) result.push({rank:data[i][0],user:data[i][1],score:data[i][2],subject:data[i][3],mode:data[i][4],date:data[i][5]});
  return {leaderboard:result,total:data.length-1};
}

// ============================================================
// 3. LOGS — Sayt loglari
// ============================================================
function getLogsSheet() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let s=ss.getSheetByName('Logs');
  if (!s) {
    s=ss.insertSheet('Logs');
    s.getRange(1,1,1,5).setValues([["ID","Tur","Foydalanuvchi","Ma'lumot","Sana"]]);
    s.getRange(1,1,1,5).setFontWeight('bold').setBackground('#4A148C').setFontColor('#FFF').setFontSize(11);
    s.setColumnWidth(1,60);s.setColumnWidth(2,130);s.setColumnWidth(3,160);s.setColumnWidth(4,400);s.setColumnWidth(5,170);
    s.freezeRows(1); s.getRange(1,1,1,5).createFilter();
    const tr=s.getRange('B2:B5000');
    s.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('login').setBackground('#C8E6C9').setFontColor('#1B5E20').setRanges([tr]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('logout').setBackground('#FFF9C4').setFontColor('#E65100').setRanges([tr]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('autokick').setBackground('#FFCDD2').setFontColor('#B71C1C').setRanges([tr]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('cert_download').setBackground('#E1F5FE').setFontColor('#01579B').setRanges([tr]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('test_finish').setBackground('#F3E5F5').setFontColor('#4A148C').setRanges([tr]).build()
    ]);
  }
  return s;
}

function saveLog(data) {
  const s=getLogsSheet(); const lr=s.getLastRow();
  const now=Utilities.formatDate(data.date?new Date(data.date):new Date(),Session.getScriptTimeZone(),"dd.MM.yyyy HH:mm:ss");
  const ds=typeof data.data==='object'?JSON.stringify(data.data):String(data.data||'');
  s.getRange(lr+1,1,1,5).setValues([[lr,data.type||'unknown',data.user||'unknown',ds,now]]);
  const bg={login:'#E8F5E9',logout:'#FFFDE7',autokick:'#FFEBEE',cert_download:'#E3F2FD',test_finish:'#F3E5F5',test_start:'#F9FBE7'};
  s.getRange(lr+1,1,1,5).setBackground(bg[data.type]||'#FAFAFA');
  const total=s.getLastRow();
  if(total>5001) s.deleteRows(2,total-5001);
}

function getLogs(limit) {
  const s=getLogsSheet(); const data=s.getDataRange().getValues();
  const max=limit||50; const result=[];
  const start=Math.max(1,data.length-max);
  for(let i=data.length-1;i>=start;i--) result.push({id:data[i][0],type:data[i][1],user:data[i][2],data:data[i][3],date:data[i][4]});
  return {logs:result,total:data.length-1};
}

// ============================================================
// SETUP & MENU
// ============================================================
function setupDatabase() {
  getCloudDBSheet(); getLeaderboardSheet(); getLogsSheet();
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let dash=ss.getSheetByName('Dashboard');
  if (!dash) { dash=ss.insertSheet('Dashboard'); } else { dash.clear(); }
  dash.getRange('A1').setValue('PRO EXAM v12 — Database Monitor').setFontSize(16).setFontWeight('bold').setFontColor('#0A84FF');
  const rows=[
    [''],
    ['CLOUDDB'],['Jami yozuvlar',"=COUNTA(CloudDB!A:A)-1"],['User stats',"=COUNTIF(CloudDB!A:A,\"stats_*\")"],
    [''],
    ['LEADERBOARD'],['Jami natijalar',"=COUNTA(Leaderboard!A:A)-1"],["90%+",'=COUNTIF(Leaderboard!C:C,">=90")'],["O'rtacha",'=IF(COUNTA(Leaderboard!C2:C)>0,AVERAGE(Leaderboard!C2:C),0)'],
    [''],
    ['LOGS'],['Jami loglar',"=COUNTA(Logs!A:A)-1"],['Login',"=COUNTIF(Logs!B:B,\"login\")"],['AutoKick',"=COUNTIF(Logs!B:B,\"autokick\")"],['Sertifikat',"=COUNTIF(Logs!B:B,\"cert_download\")"],
    [''],
    ["Yangilandi","=NOW()"]
  ];
  dash.getRange(2,1,rows.length,2).setValues(rows.map(r=>r.length===2?r:[r[0],'']));
  dash.setColumnWidth(1,220); dash.setColumnWidth(2,160);
  ss.setActiveSheet(dash); ss.moveActiveSheet(1);
  SpreadsheetApp.getUi().alert('✅ PRO EXAM v12 Database tayyor!\n\nKeyingi qadam:\nDeploy → New deployment → Web App\n• Execute as: Me\n• Who has access: Anyone\n\nURL → script.js dagi DB_URL ga qo\'ying!');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎓 PRO EXAM')
    .addItem('⚙ Database sozlash', 'setupDatabase')
    .addItem('🏆 Leaderboard tartiblash', 'sortLeaderboard')
    .addSeparator()
    .addItem('🧪 Ulanishni tekshirish', 'testConnection')
    .addSeparator()
    .addItem('🗑 Loglarni tozalash', 'clearLogs')
    .addItem('🗑 Leaderboardni tozalash', 'clearLeaderboard')
    .addToUi();
}

function testConnection() {
  try {
    cloudDBSet('_test_ping_', JSON.stringify({ping:'pong',time:new Date().toISOString()}));
    const r=cloudDBGet('_test_ping_');
    saveLog({type:'system_test',data:{ok:true},user:'system'});
    SpreadsheetApp.getUi().alert('✅ Ulanish muvaffaqiyatli!\n\nCloudDB: '+JSON.stringify(r));
  } catch(e) { SpreadsheetApp.getUi().alert('❌ Xatolik:\n'+e.toString()); }
}

function clearLogs() {
  const ui=SpreadsheetApp.getUi();
  if(ui.alert('Loglarni o\'chirish?','Bu amalni qaytarib bo\'lmaydi!',ui.ButtonSet.YES_NO)===ui.Button.YES){
    const s=getLogsSheet(); const lr=s.getLastRow(); if(lr>1)s.deleteRows(2,lr-1);
    ui.alert('✅ Loglar tozalandi.');
  }
}

function clearLeaderboard() {
  const ui=SpreadsheetApp.getUi();
  if(ui.alert('Leaderboardni o\'chirish?','Bu amalni qaytarib bo\'lmaydi!',ui.ButtonSet.YES_NO)===ui.Button.YES){
    const s=getLeaderboardSheet(); const lr=s.getLastRow(); if(lr>1)s.deleteRows(2,lr-1);
    ui.alert('✅ Leaderboard tozalandi.');
  }
}
