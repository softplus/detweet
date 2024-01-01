# detweet

Remove Tweets via Puppeteer - using the Google Chrome browser.

The Twitter API only supports 50 delete operations per day.
How do you delete 20k tweets? Automation.

(c) 2023-2024 John Mueller, MIT Licensed.
https://github.com/softplus/ & https://johnmu.com

Uses Node & Puppeteer, which runs Chrome. Tested on Ubuntu.
You need to install Node beforehand.
Likely to work on other platforms, but I didn't test.

## Initial setup

```bash
# Grab repo
git clone https://github.com/softplus/detweet
cd detweet

# Get Puppeteer & fs (filesystem) Node libraries
npm init
npm install puppeteer
npm install fs
```

### Get updates

```bash
# get repo & update npms
git pull
npm update
```

## Run

1. Get list of tweets (see below)

Put the list of tweet URLs into `data/tweets_delete.csv` (just a list of URLS for your account)

2. Clean up temporary files: delete `data/_counter.csv`, empty `data/_errors/`

3. Run first time:

```bash
npm detweet.js
```

This will open a browser window and navigate to Twitter.
You need to log in for it to continue.

4. Log in to Twitter in Browser window

5. Subsequent runs don't need to log in to Twitter.

The browser window will remain open and show what's happening.
This code does not copy & take your Twitter data, though theoretically it could.
Don't run random code that accesses your Twitter account.
Should you run this? Don't trust me, ideally look at the code.
Sorry that I can't be more reassuring, but there are jerks out there who might do weird stuff.
I don't think I'm one, but who knows.

Set your Twitter account to English.
This script uses text on the UI to understand what's happening.

You can break at any time (ctrl-C).
It keeps track of the index within your `tweets_delete.csv` file and starts at the last entry.
It processes up to 5000 tweets and then exists.

When it encounters a tweet already deleted, it just continues.
It looks for the UI text, so if your Twitter account has a non-English language, this might not work :-).

## Like & Subscribe

Sorry.

If you want to delete >3000 tweets, get a Twitter subscription.
Without a subscription, you'll get rate-limited on a daily basis after 3000 tweets or so, it's annoying.
Sorry. Still better than 50/day, right?

When rate-limiting triggers, it goes into a backoff mode, retrying every 30 minutes.
This won't help if you want to delete many tweets.

Good luck.

## Getting a list of Tweets

You can get a list of your tweets by requesting a data-dump and then extracting the tweets from there.

1. Request a data-dump from Twitter: https://help.twitter.com/en/managing-your-account/how-to-download-your-x-archive

2. When it's ready, download the zip file and extract it.

3. Copy the files to your Google Drive

4. Run this Google Colab: https://colab.research.google.com/gist/softplus/9e7210f62ee5a3a1b535fe28b1504be4/tweets_to_csv.ipynb (Source: https://gist.github.com/softplus/9e7210f62ee5a3a1b535fe28b1504be4#file-tweets_to_csv-ipynb )

5. Take the `tweets.csv` file and import it into Google Sheets

6. Go through the list, pick the ones you want to keep, etc.

7. Take the list of Twitter URLs and save them into `data/tweets_delete.csv`.

8. Run the script as above.

## Questions?

I probably can't help much, but you can try to reach me on Mastodon: https://johnmu.com/+


Q: But why?

A: I wanted to delete my tweets, but I had >20k tweets, so I couldn't use the Twitter API.


Q: Why not use the Twitter API?

A: It only allows 50 delete operations per day.


Q: Why can't it delete all retweets?

A: Retweets / reposts from somewhere in 2018 until before mid-September 2022 are not deletable for some unknown reason. IDK. Maybe the API can do it? I have 1000s of these, so the API doesn't really help there.


Q: Can I use proxies to get around the rate limiting?

A: The rate limiting appears to be on a per-account basis, so no, proxies won't help.