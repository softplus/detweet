'use strict';
const fs = require('fs');
const puppeteer = require('puppeteer');

const FILE_DONE   = './data/tweets_processed.csv';
const FILE_INPUT  = './data/tweets_delete.csv';
const FILE_COUNTER= './data/_counter.csv';
const FILE_SESSION= './data/_session';
const FILE_ERRORS = './data/_errors';

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}

let f_input_tweets = fs.readFileSync(FILE_INPUT, 'utf-8');
let input_tweets = f_input_tweets.split("\n");
let index_start = 0;
try {
    let f_counter = fs.readFileSync(FILE_COUNTER, 'utf8');
    index_start = parseInt(f_counter);
    console.log('. Starting at index ' + String(index_start));
} catch (e) { ; }
let items_to_try = 1000;
let item_counter = 0;

const WAIT_PER_ITEM = 3000;
const WAIT_PER_CLICK = 500;
const WAIT_PER_PAGE_LOAD = 1000;

(async() => {
    //var browser, page;
    let browser = await puppeteer.launch({ headless: false, userDataDir: FILE_SESSION});
    let page = await browser.newPage();

    let response = await page.goto('https://twitter.com', {waitUntil: 'networkidle2'});
    console.log("Log in, then navigate to https://twitter.com/home ; times out in 60 sec")
    // wait up to a minute ...
    for (let repeat=60*2; repeat>0; repeat--) {
        await delay(500);
        if (page.url() == 'https://twitter.com/home') break;
    }
    if (page.url() != 'https://twitter.com/home') {
        console.log("! Timed out. Aborting.");
        await browser.close();
        process.exit();
    }
    // we're on this page now
    console.log("% Looks logged in, just a sec.");
    await delay(WAIT_PER_PAGE_LOAD);

    for (item_counter=0; item_counter<items_to_try; item_counter++) {
        await delay(WAIT_PER_ITEM);
        const item_index = item_counter + index_start;
        let url = input_tweets[item_index];
        console.log("> Index: " + String(item_index) + ", URL: " + url );
        response = await page.goto(url, {waitUntil: 'networkidle2'});
        await delay(WAIT_PER_PAGE_LOAD);

        let ok = true, failure = false;

        // click "more" menu
        const menu_0_btns = await page.$$('div[data-testid="caret"]');
        let was_clicked = false;
        for (const e_this of menu_0_btns) { 
            const item_top = await page.evaluate((elem) => {
                    return elem.getBoundingClientRect().top;
                }, e_this);
            if (item_top > 0) {
                console.log('. found & clicked');
                e_this.click(); 
                was_clicked = true; 
                break; 
            }
        }

        if (!was_clicked) {
            console.log("x couldn't click menu");
            let is_deleted = await page.evaluate((seeking) => {
                return document.body.textContent.includes("this page doesn");
                // Hmm...this page doesn’t exist. Try searching for something else.
            });
            console.log('. is_deleted = ' + String(is_deleted)); 
            if (!is_deleted) {
                await page.screenshot({ path: FILE_ERRORS + "/" + String(item_index) + ".png" });
                console.log("x Weird");
                failure = true;
            }
            ok = false;
        }

        if (ok) {
            await delay(WAIT_PER_CLICK);
            const menu_1_btns = await page.$$('div[role="menuitem"]');
            const menu_delete = menu_1_btns[0];
            if (menu_delete) {
                let menu_delete_text = await page.evaluate(el => el.textContent, menu_delete);
                if (menu_delete_text && menu_delete_text=="Delete") {
                    menu_delete.click();
                } else {
                    console.log("x no delete item.");
                    failure = true;
                    ok = false;
                }    
            } else {
                console.log("x no delete menu at all.");
                failure = true;
                ok = false;
            }
        }

        if (ok) {
            await delay(WAIT_PER_CLICK);
            const menu_2_btns = await page.$$('div[data-testid="confirmationSheetConfirm"]');
            if (menu_2_btns.length>0) {
                menu_2_btns[0].click();
                console.log(". clicked confirm.");
            } else {
                console.log("x no confirm dialog");
                ok = false;
                failure = true;
            }
        }

        fs.writeFileSync(FILE_COUNTER, String(item_index));
        if (ok) {
            fs.appendFileSync(FILE_DONE, url + "\n");
            await delay(WAIT_PER_PAGE_LOAD);
        } else {
            if (failure) {
                const screenshot_file = FILE_ERRORS + "/" + String(item_index) + ".png";
                console.log(". Screenshotting: " + screenshot_file);
                await page.screenshot({ path: screenshot_file });
                console.log(". Giving more time, adding to retry list.")
                await delay(WAIT_PER_ITEM*3);
                fs.appendFileSync(FILE_INPUT, url + "#\n");
            }
        }

        // next
        if (item_counter+index_start>input_tweets.length) break;
    }

    console.log(". Finished! Processed: " + String(item_counter) + " items");
    await delay(WAIT_PER_ITEM);
    await browser.close();
    process.exit();

})(); 
