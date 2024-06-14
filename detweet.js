'use strict';

/** 
 * # Copyright 2023-2024, John Mueller
 * # MIT License, see LICENSE file
 * # SPDX-FileCopyrightText: 2023-2024 John Mueller
 * # SPDX-License-Identifier: MIT
 * # https://github.com/softplus/detweet
 */

const fs = require('fs');
const puppeteer = require('puppeteer');

const FILE_DONE   = './data/tweets_processed.csv';
const FILE_INPUT  = './data/tweets_delete.csv';
const FILE_CANT   = './data/tweets_old_reposts.csv';
const FILE_COUNTER= './data/_counter.csv';
const FILE_SESSION= './data/_session';
const FILE_ERRORS = './data/_errors';

const TWITTER_HOST= 'x.com'; // aka 'twitter.com'

const ITEMS_TO_TRY = 5000;
const WAIT_PER_ITEM = 3000; // ms
const WAIT_PER_CLICK = 500; // ms
const WAIT_PER_PAGE_LOAD = 1000; // ms

// let's wait this many ms
function delay(time_ms) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time_ms);
    });
}

// check if the open menu has a "Delete" item, if so, return it
async function has_menu_delete(page) {
    const menu_delete = await page.$('div[role="menuitem"]');
    if (menu_delete) {
        let menu_delete_text = await page.evaluate(el => el.textContent, menu_delete);
        if (menu_delete_text=="Delete") return menu_delete;
    }
    return false;
}

// find this tweets "..." menu that leads to a Delete menu, click it
async function click_dotdotdot(page) {
    // click "more" menu that leads to delete
    const menu_0_btns = await page.$$('button[data-testid="caret"]');
    let was_clicked = false, attempts = 0;
    for (const e_this of menu_0_btns) { 
        const item_top = await page.evaluate((elem) => {
                return elem.getBoundingClientRect().top;
            }, e_this);
        if (item_top > 0) {
            console.log('. found & clicked offset=' + String(attempts));
            e_this.click(); attempts++;
            await delay(WAIT_PER_CLICK);
            if (await has_menu_delete(page)!=false) {
                was_clicked = true; 
                break; 
            }
            console.log(". wrong menu; trying next");
            page.keyboard.press("Escape");
            await delay(WAIT_PER_CLICK);
            if (attempts>10) break;
        }
    }
    return was_clicked;
}

// Click on the delete menu item
async function click_menudelete(page) {
    const menu_delete = await has_menu_delete(page);
    if (menu_delete) {
        menu_delete.click();
        await delay(WAIT_PER_CLICK);
        return true;
    } else {
        console.log("x no delete menu.");
    }
    return false;
}

// Click to confirm the open command
async function click_confirm(page) {
    const menu_2_btn = await page.$('button[data-testid="confirmationSheetConfirm"]');
    if (menu_2_btn) {
        menu_2_btn.click();
        console.log(". clicked confirm.");
        return true;
    } else {
        console.log("x no confirm dialog");
    }
    return false;
}

// check for unretweet button, click it
async function click_unretweet(page) {
    const unretweet_btn = await page.$('button[data-testid="unretweet"]');
    if (unretweet_btn) {
        unretweet_btn.click();
        await delay(WAIT_PER_CLICK);
        const menu_btn = await page.$('div[role="menuitem"]');
        if (menu_btn) {
            let menu_item_text = await page.evaluate(el => el.textContent, menu_btn);
            if (menu_item_text=="Undo repost") {
                menu_btn.click();
                await delay(WAIT_PER_CLICK);
                console.log(". clicked unretweet");
                return true;
            } else {
                page.keyboard.press("Escape");
                await delay(WAIT_PER_CLICK);
            }
        }
    }
    return false;
}

// Is this tweet deleted already?
async function tweet_is_deleted(page) {
    let is_found = await page.evaluate((seeking) => {
        return document.body.textContent.includes("this page doesn");
        // Hmm...this page doesn’t exist. Try searching for something else.
    });
    if (is_found) console.log('. Tweet is deleted');
    return is_found;
}

// Is Twitter blocking us? $14 gets you more quota
async function twitter_is_blocked(page) {
    let is_found = await page.evaluate((seeking) => {
        return document.body.textContent.includes("Something went wrong. Try reloading.");
        // Something went wrong. Try reloading.
    });
    return is_found;
}

// Is this an old repost that cant be deleted
async function twitter_is_old_repost(page) {
    let is_found = await page.evaluate((seeking) => {
        return document.body.textContent.includes("You reposted");
        // You reposted
    });
    return is_found;
}

// retweet from an account gone private
async function tweet_is_private(page) {
    let is_found = await page.evaluate((seeking) => {
        return document.body.textContent.includes("unable to view this Post because this account");
        // You’re unable to view this Post because this account owner limits who can view their Posts. Learn more
    });
    if (is_found) console.log(". Retweeting account it private.");
    return is_found;
}

// retweet from an account that is gone
async function tweet_account_gone(page) {
    let is_found = await page.evaluate((seeking) => {
        return document.body.textContent.includes("Post is from an account that no longer exists");
        // This Post is from an account that no longer exists. Learn more
    });
    if (is_found) console.log(". Retweeting account no longer exists.");
    return is_found;
}

// retweet from an account that is suspended
async function tweet_account_suspended(page) {
    let is_found = await page.evaluate((seeking) => {
        return document.body.textContent.includes("Post is from a suspended account");
        // This Post is from a suspended account. Learn more
    });
    if (is_found) console.log(". Retweeting account is suspended.");
    return is_found;
}

// Well, this failed. Let's screenshot & log it for retry
async function error_retry(page, item_index, url) {
    const screenshot_file = FILE_ERRORS + "/" + String(item_index) + ".png";
    console.log(". Screenshotting: " + screenshot_file);
    await page.screenshot({ path: screenshot_file });
    console.log(". Will retry.");
    fs.appendFileSync(FILE_INPUT, url + "#\n");
}

// load the list of tweets to delete
let f_input_tweets = fs.readFileSync(FILE_INPUT, 'utf-8');
const input_tweets = f_input_tweets.split("\n");
let index_start = 0;
try {
    let f_counter = fs.readFileSync(FILE_COUNTER, 'utf8');
    index_start = parseInt(f_counter);
    console.log('. Starting at index ' + String(index_start));
} catch (e) { ; }
let item_counter = 0;
let backoff_delay = 0;

// This is pretty much our stuff
(async() => {
    let browser = await puppeteer.launch({ 
        headless: false, userDataDir: FILE_SESSION, defaultViewport: null});
    let page = await browser.newPage();

    // User must be logged in. Session data is saved for next time.
    let response = await page.goto('https://' + TWITTER_HOST, {waitUntil: 'networkidle2'});
    console.log("> Log in, then navigate to https://" + TWITTER_HOST + "/home ; times out in 120 sec")
    // wait up to a minute ...
    for (let repeat=120*2; repeat>0; repeat--) {
        await delay(500);
        if (page.url() == 'https://' + TWITTER_HOST + '/home') break;
    }
    if (page.url() != 'https://' + TWITTER_HOST + '/home') {
        console.log("! Timed out. Aborting.");
        await browser.close();
        process.exit();
    }

    // we're on this page now
    console.log(". Looks logged in, just a sec.");
    await delay(WAIT_PER_PAGE_LOAD);

    // Try to delete as many tweets as specified in ITEMS_TO_TRY
    for (item_counter=0; item_counter<ITEMS_TO_TRY; item_counter++) {
        const item_index = item_counter + index_start;
        if (item_index>=input_tweets.length) break;
        let url = input_tweets[item_index];
        if (url=="") continue;
        await delay(WAIT_PER_ITEM + backoff_delay);
        console.log("> Line " + String(item_index) + ", URL " + url + " at " + 
            (new Date()).toISOString());
        fs.writeFileSync(FILE_COUNTER, String(item_index));
        response = await page.goto(url, {waitUntil: 'networkidle2'});
        await delay(WAIT_PER_PAGE_LOAD);

        let ok = false;

        // is twitter blocking us again? 
        if (await twitter_is_blocked(page)) {
            backoff_delay = Math.min(2*60*1000 + backoff_delay*1.5, 30*60*1000);
            console.log("x looks rate limited, backoff-delay increased to " + String(backoff_delay));
            await error_retry(page, item_index, url);
            continue; // retry next
        }
        if (backoff_delay>0) {
            backoff_delay = Math.max(0.7 * backoff_delay - 500, 0); 
            console.log(". backoff-delay reduced to " + String(backoff_delay));
        }

        // is the tweet deleted, or account somehow limited
        if (await tweet_is_deleted(page)) continue;
        if (await tweet_is_private(page)) continue;
        if (await tweet_account_gone(page)) continue;
        if (await tweet_account_suspended(page)) continue;
        
        // click the menu & delete it
        if (await click_dotdotdot(page)) {
            if (await click_menudelete(page)) {
                if (await click_confirm(page)) {
                    ok = true;
                }
            }
        } else {
            if (await click_unretweet(page)) {
                ok = true;
            } else {
                if (await twitter_is_old_repost(page)) {
                    // well, tough.
                    console.log("x This is an old repost that can't be deleted.")
                    fs.appendFileSync(FILE_CANT, url.replaceAll("#", "") + "\n");
                    ok = true;
                }
            }
        }

        if (ok) {
            // log as successful
            fs.appendFileSync(FILE_DONE, url.replaceAll("#", "") + "\n");
            await delay(WAIT_PER_PAGE_LOAD);
        } else {
            // or retry later
            await error_retry(page, item_index, url);
        }

        // next
        if (item_counter+index_start>input_tweets.length) break;
    }

    // Icing follows. 
    console.log(". Finished! Processed: " + String(item_counter) + " items");
    await delay(WAIT_PER_ITEM);
    await browser.close();
    process.exit();

    // Wear sunscreen.
})(); 
