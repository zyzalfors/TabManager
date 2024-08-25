function encode(text) {
 return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");
}

chrome.omnibox.onInputChanged.addListener(async (text, show) => {
 const cmd = text.match(/^.+:/i) ? text.match(/^.+:/i)[0] : null;
 const regex = text.match(/:.+/i) ? new RegExp(text.match(/:.+/i)[0].substring(1), "i") : null;
 let results = [];
 if(/^(goto|save|close|mute|pin|reload|duplicate):/i.test(text)) {
  const tabs = await chrome.tabs.query({});
  for(const tab of tabs) {
   const content = {cmd: cmd, id: tab.id, index: tab.index, title: tab.title, url: tab.url, muted: tab.mutedInfo.muted, pinned: tab.pinned};
   if(!regex || regex.test(tab.url) || regex.test(tab.title)) results.push({content: JSON.stringify(content), description: cmd + " " + encode(tab.title) + " | " + encode(tab.url)});
  }
 }
 else if(/^(open|delete):/i.test(cmd)) {
  const storage = await chrome.storage.local.get();
  if(storage.tabs) {
   for(const tab of storage.tabs) {
    if(!regex || regex.test(tab.url) || regex.test(tab.title)) results.push({content: JSON.stringify({cmd: cmd, url: tab.url}), description: cmd + " " + encode(tab.title) + " - " + encode(tab.url)});
   }
  }
 }
 else if(/^export/i.test(cmd)) results.push({content: JSON.stringify({cmd: cmd}), description: "export tabs"});
 show(results);
});

chrome.omnibox.onInputEntered.addListener(async (content, disp) => {
 const input = JSON.parse(content);
 if(/^goto:/i.test(input.cmd)) chrome.tabs.highlight({tabs: [input.index]});
 else if(/^save:/i.test(input.cmd)) {
  const storage = await chrome.storage.local.get();
  if(!storage.tabs) chrome.storage.local.set({tabs: [{title: input.title, url: input.url}]});
  else if(!storage.tabs.find(tab => tab.url === input.url)) {
   storage.tabs.push({title: input.title, url: input.url});
   chrome.storage.local.set({tabs: storage.tabs});
  }
 }
 else if(/^close:/i.test(input.cmd)) chrome.tabs.remove(input.id);
 else if(/^mute:/i.test(input.cmd)) chrome.tabs.update(input.id, {muted: !input.muted});
 else if(/^pin:/i.test(input.cmd)) chrome.tabs.update(input.id, {pinned: !input.pinned});
 else if(/^reload:/i.test(input.cmd)) chrome.tabs.reload(input.id, {bypassCache: true});
 else if(/^duplicate:/i.test(input.cmd)) chrome.tabs.duplicate(input.id);
 else if(/^open:/i.test(input.cmd)) chrome.tabs.create({url: input.url});
 else if(/^delete:/i.test(input.cmd)) {
  const storage = await chrome.storage.local.get();
  if(storage.tabs) {
   const i = storage.tabs.findIndex(tab => tab.url === input.url);
   if(i > -1) {
    storage.tabs.splice(i, 1);
    chrome.storage.local.set({tabs: storage.tabs});
   }
  }
 }
 else if(/^export/i.test(input.cmd)) {
  const storage = await chrome.storage.local.get();
  if(storage.tabs) chrome.downloads.download({url: "data:application/json," + encodeURIComponent(JSON.stringify(storage, null, 1)), filename: "tabs.json", conflictAction: "uniquify", saveAs: true});
 }
});