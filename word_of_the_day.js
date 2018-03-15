/*
global muxbots
*/

muxbots.onFeedPull((callback) => {
  if (shouldFetchRSS()) {
    muxbots.http.get('https://www.merriam-webster.com/wotd/feed/rss2', function (response) {
      if (!response.data) {
        muxbots.newResponse()
          .addNoResultsMessage('Error fetching the words of the day.')
          .send(callback)
        return
      }
      const items = response.data.split('<item>')
      items.shift()
      const words = items.map((item) => {
        return {
          'url': getURL(item)
        }
      })

      muxbots.localStorage.setItem('words', words)
      const word = getUnseenWord(words)
      if (word) {
        fetchFullArticle(word, callback)
      } else {
        muxbots.newResponse()
          .addNoResultsMessage('No more new words of the day.')
          .send(callback)
      }
      const currentDate = new Date()
      muxbots.localStorage.setItem('lastFetchTime', currentDate.getTime())
    })
  } else {
    const words = muxbots.localStorage.getItem('words')
    const word = getUnseenWord(words)
    if (word) {
      fetchFullArticle(word, callback)
    } else {
      muxbots.newResponse()
        .addNoResultsMessage('No more new words of the day.')
        .send(callback)
    }
  }
})

function shouldFetchRSS () {
  const lastFetchTime = muxbots.localStorage.getItem('lastFetchTime')
  if (lastFetchTime === undefined) {
    return true
  }
  const currentDate = new Date()
  // 5 minutes time interval.
  return (currentDate.getTime() - lastFetchTime) < 300000
}

function getURL (item) {
  const results = /<link><!\[CDATA\[(.*)\]\]><\/link>/.exec(item)
  return encodeURI(results[1])
}

function getUnseenWord (words) {
  let viewedURLs = muxbots.localStorage.getItem('viewedURLs') || []
  let viewedURLSet = new Set(viewedURLs)
  let newViewedURLs = []
  let unseenWord = null
  words.forEach((word) => {
    if (viewedURLSet.has(word.url)) {
      newViewedURLs.push(word.url)
    } else {
      unseenWord = unseenWord || word
    }
  })
  if (unseenWord) {
    newViewedURLs.push(unseenWord.url)
  }
  muxbots.localStorage.setItem('viewedURLs', newViewedURLs)
  return unseenWord
}

function fetchFullArticle (word, callback) {
  muxbots.http.get(word.url, function (response) {
    if (!response.data) {
      muxbots.newResponse()
        .addNoResultsMessage('Error fetching a word of the day.')
        .send(callback)
      return
    }
    const title = getOpenGraphTitle(response.data)
    const image = getOpenGraphImage(response.data)
    muxbots.newResponse()
      .addWebpage(muxbots.newWebpage()
        .setURL(word.url)
        .setTitle(title)
        .setImage(image))
      .send(callback)
  })
}

function getOpenGraphTitle (pageHtml) {
  const results = /<meta property="og:title" content="(.*)" \/>/.exec(pageHtml)
  return results[1]
}

function getOpenGraphImage (pageHtml) {
  const results = /<meta property="og:image" content="(.*)" \/>/.exec(pageHtml)
  return results[1]
}
