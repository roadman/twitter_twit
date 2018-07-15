'use strict';

import * as Twit from 'twit';

export declare namespace twitter {
  interface IConfigTwitterAllowDenys {
    allow : string[];
    deny  : string[];
  }

  interface IConfigTwitterAccounts {
    retweet_accounts: IConfigTwitterAllowDenys;
    tweet_accounts  : IConfigTwitterAllowDenys;
  }

  interface ITweetData {
    tweet_src     :any;
    tweet         :any;
    tweet_id      :string;
    is_rt         :boolean;
    is_qt         :boolean;
    is_extend     :boolean;
    text          :string;
    name          :string;
    screen_name   :string;
    tweet_acount  :string;
    retweet_acount:string;
    timestamp_ms  :string;

  }

  interface IMediaData {
    mediaUrl  :string;
    mediaType :string;
    tweetId   :string;
  }
}

export enum MediaType {
  MEDIA_PHOTO    = 'media_photo',
  MEDIA_VIDEO    = 'media_video',
  MEDIA_ANIMEGIF = 'media_animegif',
  MEDIA_YOUTUBE  = 'media_youtube'
}

// twitter stream
export let getTwitter = (
  consumer_key:string,
  consumer_secret:string,
  access_token:string,
  access_token_secret:string
):Twit => {
  return new Twit({
    "consumer_key"       : consumer_key,
    "consumer_secret"    : consumer_secret,
    "access_token"       : access_token,
    "access_token_secret": access_token_secret
  });
}

// twitter stream
export let getTwitterStream = (twIns:Twit):Twit.Stream => twIns.stream('user');

const isAccountCheck = (
  listAccountTweetAllow:string[],
  listAccountTweetDeny:string[],
  listAccountRetweetAllow:string[],
  listAccountRetweetDeny:string[],
  tweetAccount:string,
  retweetAccount:string
):boolean => {
  let isTarget = true

  if (listAccountTweetDeny.indexOf('*') != -1 ||
    listAccountTweetDeny.indexOf(tweetAccount) != -1) {
    isTarget = false
  }

  if (retweetAccount != null && isTarget) {
    if (listAccountRetweetDeny.indexOf('*') != -1 ||
      listAccountRetweetDeny.indexOf(retweetAccount) != -1) {
      isTarget = false
    }
  }

  if (isTarget) {
    return true
  }

  if (listAccountTweetAllow.indexOf('*') != -1 ||
    listAccountTweetAllow.indexOf(tweetAccount) != -1) {
    return true
  }

  if (retweetAccount != null) {
    if (listAccountRetweetAllow.indexOf('*') != -1 ||
      listAccountRetweetAllow.indexOf(retweetAccount) != -1) {
      return true
    }
  }

  return false
}

export let getTweetData = (tweetSrc:any):twitter.ITweetData => {
  let tweetData:twitter.ITweetData = {
    tweet_src     : tweetSrc,
    tweet         : null,
    tweet_id      : null,
    is_rt         : ('retweeted_status' in tweetSrc ? true : false),
    is_qt         : false,
    is_extend     : false,
    text          : null,
    name          : null,
    screen_name   : null,
    tweet_acount  : tweetSrc.user.screen_name,
    retweet_acount: null,
    timestamp_ms  : tweetSrc.timestamp_ms
  }

  // RTの場合はRT tweetを使用
  if (tweetData.is_rt) {
    tweetData.tweet = tweetData.tweet_src.retweeted_status
    tweetData.retweet_acount = tweetData.tweet_src.user.screen_name
  } else {
    tweetData.tweet = tweetSrc
  }
  tweetData.tweet_id = tweetData.tweet.id_str
  tweetData.text = tweetData.tweet.text
  tweetData.name = tweetData.tweet.user.name
  tweetData.screen_name = tweetData.tweet.user.screen_name
  tweetData.tweet_acount = tweetData.tweet.user.screen_name

  // qtの場合はqt tweetを使用
  tweetData.is_qt = ('quoted_status' in tweetData.tweet ? true : false)
  if (tweetData.is_qt) {
    //console.log(tweetData.tweet.quoted_status)

    tweetData.tweet = tweetData.tweet.quoted_status

    // RTされたQTではない場合はQTしたaccountをRTしたaccountとして設定
    if (tweetData.retweet_acount === null) {
      tweetData.retweet_acount = tweetData.tweet.user.screen_name
    }

    // quoteの場合はquoteのtextを利用
    tweetData.tweet_id = tweetData.tweet.id_str
    tweetData.text = tweetData.tweet.text
    tweetData.name = tweetData.tweet.user.name
    tweetData.screen_name = tweetData.tweet.user.screen_name
    tweetData.tweet_acount = tweetData.tweet.user.screen_name
  }

  // 拡張仕様
  tweetData.is_extend = ('extended_tweet' in tweetData.tweet ? true : false)
  if (tweetData.is_extend) {
    //console.log(tweetData.tweet.extended_tweet)

    tweetData.tweet = tweetData.tweet.extended_tweet
      // extendの場合はextendのfull textを利用
    tweetData.text = tweetData.tweet.full_text
  }

  return tweetData;
}

export let mediaContents = async (tweetData:twitter.ITweetData, isCheck:boolean, downloadAccount:twitter.IConfigTwitterAccounts, tweetAccountDeny:string[]):Promise<twitter.IMediaData[]> => {
  // downloadするかcheck
  if(isCheck) {
    let isDownload = isAccountCheck(
      downloadAccount.tweet_accounts.allow,
      tweetAccountDeny,
      downloadAccount.retweet_accounts.allow,
      downloadAccount.retweet_accounts.deny,
      tweetData.tweet_acount,
      tweetData.retweet_acount
    )
    if (!isDownload) {
      console.log('not download.')
      return null;
    }
  }

  let mediaNum:number;
  let isTweetMedia = false;
  if (('extended_entities' in tweetData.tweet) && ('media' in tweetData.tweet.extended_entities)) {
    mediaNum = tweetData.tweet.extended_entities.media.length;
    isTweetMedia = true;
  } else if(('entities' in tweetData.tweet) && ('urls' in tweetData.tweet.entities)) {
    mediaNum = tweetData.tweet.entities.urls.length;
  } else {
    console.log('entities not exist.')
    return null;
  }

  if(!mediaNum || mediaNum === 0) {
    console.log('media 0.')
    return null;
  }

  let mediaEntityList:any[];
  if(isTweetMedia === true) {
    mediaEntityList = tweetData.tweet.extended_entities.media;
  } else {
    mediaEntityList = tweetData.tweet.extended_entities.urls;
  }

  let mediaList = await Promise.all<twitter.IMediaData>(mediaEntityList.map(mediaEntity => {
    return new Promise((resolve, reject) => {
      try {
        let result = procMediaContent(mediaEntity, tweetData, isTweetMedia);
        resolve(result);
      }
      catch(err) {
        reject(err);
      }
    });
  }));
  if (mediaList.length === 0) {
    return null;
  }

  return mediaList;
}

let procMediaContent = (entityVal:any, tweetData:twitter.ITweetData, isTweetMedia:boolean):twitter.IMediaData => {
  let mediaType = getMediaType(isTweetMedia, entityVal);
  if(mediaType === null) {
    console.log('unknown media type.')
    return null;
  }
  return {
    tweetId  : getTweetId(tweetData),
    mediaUrl : getMediaUrl(mediaType, entityVal),
    mediaType: mediaType
  };
}

let getMediaUrl = (mediaType:MediaType, entityVal:any):string => {
  if (mediaType === MediaType.MEDIA_PHOTO) {
    return entityVal.media_url;
  } else if (mediaType === MediaType.MEDIA_YOUTUBE) {
    return entityVal.expanded_url;
  } else if (mediaType === MediaType.MEDIA_VIDEO || mediaType === MediaType.MEDIA_ANIMEGIF) {
    // mp4のvideoをdownload
    let max_bitrate_idx = 0;
    let mediaUrl:string = null;
    for (let idx = 0; idx < entityVal.video_info.variants.length && mediaUrl === null; idx++) {
      if (entityVal.video_info.variants[idx].content_type != 'video/mp4' ||
        (idx > 0 && entityVal.video_info.variants[idx].bitrate < entityVal.video_info.variants[max_bitrate_idx].bitrate)) {
        continue;
      }
      max_bitrate_idx = idx;
    }
    return entityVal.video_info.variants[max_bitrate_idx].url
  }

  return null;
}

let getTweetId = (tweetData:twitter.ITweetData):string => {
  if (tweetData.tweet_id) {
    return tweetData.tweet_id + '-'
  } else if (tweetData.timestamp_ms) {
    return tweetData.timestamp_ms + '-'
  }

  return '';
}

let getMediaType = (isTweetMedia:boolean, entityVal:any):MediaType => {
  if(isTweetMedia) {
    // twitter media
    switch (entityVal.type) {
      case 'photo':
        return MediaType.MEDIA_PHOTO
      case 'video':
        return MediaType.MEDIA_VIDEO
      case 'animated_gif':
        return MediaType.MEDIA_ANIMEGIF
      default:
        return null;
    }
  } else if(('expanded_url' in entityVal) && (entityVal.expanded_url.match(/youtu/) !== null)) {
  // youtube video
    return MediaType.MEDIA_YOUTUBE
  }

  return null;
}

export let getImageType = (mediaType:MediaType, mediaUrl:string):string => {
  if (mediaType === MediaType.MEDIA_YOUTUBE) {
    return 'mp4';
  }

  let media_basefile = mediaUrl.replace(/\\/g, '/').replace(/.*\//, '')
  if (media_basefile === null || media_basefile === '') {
    return null;
  }

  let basefiles = media_basefile.split('.')
  if (basefiles === null || basefiles.length === 1) {
    return null;
  }

  return basefiles[(basefiles.length - 1)];
}

export let getMime = (mediaType:MediaType, imageType:string):string => {
  if (mediaType === MediaType.MEDIA_YOUTUBE) {
    return null;
  }

  if (imageType === 'png') {
    return 'image/png'
  } else if (imageType === 'jpg') {
    return 'image/jpeg'
  } else if (imageType === 'mp4') {
    return 'video/mp4'
  }

  console.log('not get imageType. ' + imageType);
  return null;
}

export let getMediaBaseFile = (screen_name:string, tweet_id:string, mediaId:string, imageType:string):string => {
  return screen_name + '-' + tweet_id + mediaId + '.' + imageType;
}