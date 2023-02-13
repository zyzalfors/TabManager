function encodeURL(url)
{
 return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt");
}

chrome.omnibox.onInputChanged.addListener((text, showSuggestions) => {
 chrome.tabs.query({currentWindow: true}).then(tabs => {
  let cmd = text.match(/^.+:/i)[0];
  let regex = new RegExp(text.replace(new RegExp(cmd, "i"), ""), "i");
  let ids = [];
  let urls = [];
  let titles = [];
  let suggestions = [];
  if(/(goto|save|close):/i.test(cmd))
  {
   for(let tab of tabs)
   {
    if(regex.test(tab.url) || regex.test(tab.title))
    {
     ids.push(tab.index);
     urls.push(encodeURL(tab.url));
     titles.push(tab.title);
     let obj = {cmd: cmd, ids: [tab.index], titles: [tab.title], urls: [encodeURL(tab.url)]};
     suggestions.push({content: JSON.stringify(obj, null, 0), description: cmd + " " + tab.title + " - " + obj.urls[0]});
    }
   }
   if(/(save|close):/i.test(cmd) && urls.length > 1)
   {
    let obj = {cmd: cmd, ids: ids, titles: titles, urls: urls};
    suggestions.push({content: JSON.stringify(obj, null, 0), description: cmd + " all filtered"});
   }
   showSuggestions(suggestions);
  }
  else if(/(open|delete|export json|export csv):/i.test(cmd))
  {
   chrome.storage.local.get().then(result => {
    if(result.urls !== undefined && result.titles !== undefined)
    {
     for(let i = 0; i < result.urls.length; i++)
     {
      let url = result.urls[i];
      let title = result.titles[i];
      if(regex.test(url) || regex.test(title))
      {
       urls.push(url);
       titles.push(title);
       let obj = {cmd: cmd, ids: [], titles: [title], urls: [url]};
       suggestions.push({content: JSON.stringify(obj, null, 0), description: cmd + " " + title + " - " + url});
      }
     }
     if(urls.length > 1)
     {
      let obj = {cmd: cmd, ids: [], titles: titles, urls: urls};
      suggestions.push({content: JSON.stringify(obj, null, 0), description: cmd + " all filtered"});
     }
     showSuggestions(suggestions);
    }
   });
  }
 });
});

chrome.omnibox.onInputEntered.addListener((content, disposition) => {
 let obj = JSON.parse(content);
 let cmd = obj.cmd;
 let ids = obj.ids;
 let titles = obj.titles;
 let urls = obj.urls;
 if(/goto:/i.test(cmd))
 {
  chrome.tabs.highlight({tabs: ids});
 }
 else if(/save:/i.test(cmd))
 {
  chrome.storage.local.get().then(result => {
   if(result.urls === undefined || result.titles === undefined)
   {
    chrome.storage.local.clear();
    chrome.storage.local.set({titles: titles, urls: urls});
   }
   else
   {
    let newTitles = Array.from(new Set(result.titles.concat(titles)));
    let newUrls = Array.from(new Set(result.urls.concat(urls)));
    chrome.storage.local.clear();
    chrome.storage.local.set({titles: newTitles, urls: newUrls});
   }
  });
 }
 else if(/export json:/i.test(cmd))
 {
  chrome.downloads.download({
   url: "data:text/plain," + JSON.stringify({titles: titles, urls: urls}, null, 1),
   filename: "tabs.txt",
   conflictAction: "uniquify",
   saveAs: true
  });
 }
 else if(/export csv:/i.test(cmd))
 {
  let csv = ["url,title"];
  for(let i = 0; i < urls.length; i++)
  {
   csv.push("\"" + titles[i] + "\",\"" + urls[i] + "\"");
  }
  chrome.downloads.download({
   url: "data:text/plain," + csv.join("\n"),
   filename: "tabs.txt",
   conflictAction: "uniquify",
   saveAs: true
  });
 }
 else if(/delete:/i.test(cmd))
 {
  chrome.storage.local.get().then(result => {
   urls.forEach(url => {
    let i = result.urls.indexOf(url);
    result.urls.splice(i, 1);
    result.titles.splice(i, 1);
   });
   let newTitles = result.titles;
   let newUrls = result.urls;
   chrome.storage.local.clear();
   chrome.storage.local.set({titles: newTitles, urls: newUrls});
  });
 }
 else if(/open:/i.test(cmd))
 {
  urls.forEach(url => chrome.tabs.create({url: url}));
 }
 else if(/close:/i.test(cmd))
 {
  ids.forEach(id => chrome.tabs.query({index: id, currentWindow: true}, tabs => {
   chrome.tabs.remove(tabs[0].id);
  }));
 }
});