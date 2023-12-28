# detweet
Remove Tweets via Puppeteer

# initial setup

```
virtualenv .venv
source .venv/bin/activate
npm init
npm install puppeteer
npm install fs user-agents
...
deactivate
```

# updates

```
git pull
source .venv/bin/activate
pip install -r requirements.txt

...
deactivate
```

# run

First: put the list of tweet URLs into /data/tweets_delete.csv (just a list of URLS for your account)

```
source .venv/bin/activate
npm try_01.js
deactivate
```

On first start, it opens a browser window where you need to log in to your Twitter account.
The Chomium session information is in /data/_session and is handled only by Chromium / Puppeteer.
Once logged in, it starts iterating through the tweets and deletes them manually.

You can break at any time.
It keeps track of the index within your tweets_delete.csv file and starts at the last entry.
It processes up to 1000 tweets and then exists.

When it encounters a critical error (UI mismatch, etc), it takes a screenshot and saves it in /data/_errors with the index number, and stops processing.

When it encounters a tweet already deleted, it just continues.
It looks for the UI text, so if your Twitter account has a non-English language, this might not work :-).

Good luck.

# Questions?

johnmu.com
