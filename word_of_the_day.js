muxbots.onFeedPull((callback) => {
  if (shouldFetchRSS()) {
    muxbots.http.get('https://www.merriam-webster.com/wotd/feed/rss2', function (response) {
      if (!response.data) {
        muxbots.newResponse()
          .send(callback, 'Error fetching the words of the day.')
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
          .send(callback, 'No more new words of the day.')
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
        .send(callback, 'No more new words of the day.')
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
        .send(callback, 'Error fetching a word of the day.')
      return
    }
    const title = getOpenGraphTitle(response.data)
    const image = getOpenGraphImage(response.data)
    muxbots.newResponse()
      .addWebpage(muxbots.newWebpage()
        .setUrl(word.url)
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
