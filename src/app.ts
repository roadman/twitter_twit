'use strict';

import * as libTwit from './lib/twitter';

// env load
require('dotenv').config();

const tw = libTwit.getTwitter(
  process.env.TWITTER_CONSUMER_KEY,
  process.env.TWITTER_CONSUMER_SECRET,
  process.env.TWITTER_ACCESS_TOKEN,
  process.env.TWITTER_ACCESS_TOKEN_SECRET
);

const twStream = libTwit.getTwitterStream(tw);

const coTweet = (tweetes:any[]) => {
  let tweetData = libTwit.getTweetData(tweetes)
  console.log(tweetData);
}

const coTweetFab = (event:any) => {
  let tweetData = libTwit.getTweetData(event.target_object)
  console.log(tweetData);
}

// tweetを監視してcallback実行
//twStream.on('tweet', coTweet)

// fabを監視してcallback実行
//twStream.on('favorite', coTweetFab)

//tw.get(
//  'search/tweets',
//  {
//    //q: 'from:roadmantw since:2018-07-01',
//    q: 'from:roadmantw since:2018-07-01 until:2018-07-03',
//    //q: 'from:roadmantw',
//    count: 50,
//  },
//  (err, data, response) => {
//    data.statuses.forEach(twitt => {
//      console.log(twitt.created_at, twitt.text);
//    });
//    console.log(data.search_metadata);
//});

tw.get(
  'statuses/user_timeline',
  {
    user_id: 'roadmantw',
    //q: 'from:roadmantw since:2018-07-01',
    //q: 'from:roadmantw since:2018-07-01 until:2018-07-03',
    //q: 'from:roadmantw',
    count: 100,
    include_rts: false,
  },
  (err, data, response) => {
    //console.log(data);
    data.forEach(twitt => {
      console.log(twitt.created_at, twitt.text);
    });
    process.exit();
});
