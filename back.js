let encode = (text) => {
 return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;");
};

chrome.omnibox.onInputChanged.addListener((text, showSuggestions) => {
 chrome.tabs.query({currentWindow: true}).then(tabs => {
  let cmd = text.match(/^.+:/i)?.shift();
  let regex = new RegExp(text.replace(new RegExp(cmd, "i"), ""), "i");
  let ids = [], urls = [], titles = [], suggestions = [];
  if(/^(goto|save|close):/i.test(cmd)) {
   for(let tab of tabs) {
    if(regex.test(tab.url) || regex.test(tab.title)) {
     ids.push(tab.index);
     urls.push(tab.url);
     titles.push(tab.title);
     let obj = {cmd: cmd, ids: [tab.index], titles: [tab.title], urls: [tab.url]};
     suggestions.push({content: JSON.stringify(obj, null, 0), description: cmd + " " + encode(tab.title) + " - " + encode(tab.url)});
    }
   }
   if(/^(save|close):/i.test(cmd) && urls.length > 1) {
    let obj = {cmd: cmd, ids: ids, titles: titles, urls: urls};
    suggestions.unshift({content: JSON.stringify(obj, null, 0), description: cmd + " all filtered"});
   }
   showSuggestions(suggestions);
  }
  else if(/^(open|delete|export json|export csv):/i.test(cmd)) {
   chrome.storage.local.get().then(result => {
    if(result.urls && result.titles) {
     for(let i in result.urls) {
      let url = result.urls[i], title = result.titles[i];
      if(regex.test(url) || regex.test(title)) {
       urls.push(url);
       titles.push(title);
       let obj = {cmd: cmd, ids: [], titles: [title], urls: [url]};
       suggestions.push({content: JSON.stringify(obj, null, 0), description: cmd + " " + encode(title) + " - " + encode(url)});
      }
     }
     if(urls.length > 1) {
      let obj = {cmd: cmd, ids: [], titles: titles, urls: urls};
      suggestions.unshift({content: JSON.stringify(obj, null, 0), description: cmd + " all filtered"});
     }
     showSuggestions(suggestions);
    }
   });
  }
 });
});

chrome.omnibox.onInputEntered.addListener((content, disposition) => {
 let obj = JSON.parse(content), cmd = obj.cmd, ids = obj.ids, titles = obj.titles, urls = obj.urls;
 if(/^goto:/i.test(cmd)) {
  chrome.tabs.highlight({tabs: ids});
 }
 else if(/^save:/i.test(cmd)) {
  chrome.storage.local.get().then(result => {
   chrome.storage.local.clear();
   if(!result.urls || !result.titles) {
    chrome.storage.local.set({titles: titles, urls: urls});
   }
   else {
    chrome.storage.local.set({titles: Array.from(new Set(result.titles.concat(titles))), urls: Array.from(new Set(result.urls.concat(urls)))});
   }
  });
 }
 else if(/^export json:/i.test(cmd)) {
  chrome.downloads.download({url: "data:application/json," + encodeURIComponent(JSON.stringify({titles: titles, urls: urls}, null, 1)), filename: "tabs.json", conflictAction: "uniquify", saveAs: true});
 }
 else if(/^export csv:/i.test(cmd)) {
  let csv = ["title,url"];
  for(let i in urls) {
   csv.push("\"" + titles[i] + "\",\"" + urls[i] + "\"");
  }
  chrome.downloads.download({url: "data:text/csv," + encodeURIComponent(csv.join("\n")), filename: "tabs.csv", conflictAction: "uniquify", saveAs: true});
 }
 else if(/^delete:/i.test(cmd)) {
  chrome.storage.local.get().then(result => {
   urls.forEach(url => {
    let i = result.urls.indexOf(url);
    result.urls.splice(i, 1);
    result.titles.splice(i, 1);
   });
   chrome.storage.local.clear();
   chrome.storage.local.set({titles: result.titles, urls: result.urls});
  });
 }
 else if(/^open:/i.test(cmd)) {
  urls.forEach(url => chrome.tabs.create({url: url}));
 }
 else if(/^close:/i.test(cmd)) {
  ids.forEach(id => chrome.tabs.query({index: id, currentWindow: true}, tabs => {chrome.tabs.remove(tabs[0].id);}));
 }
});
