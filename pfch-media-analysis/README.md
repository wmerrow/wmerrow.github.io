# Analyzing Bias in News Coverage

**Note: Data contains biased news articles including false or misleading claims.**

My final project uses the Twitter recent search API to identify articles about specified topics by a set of five news organizations, and then scrapes the organizations' websites to aggregate the text for the articles linked in the tweets. The goal is to make comparisons and show media bias and other differences in news coverage. I analyzed content by five news organizations: the New York Times, Vox, CNN, Fox News, and the Trump-friendly One America News Network. 

### Instructions

The script analyzes content by the New York Times, Vox, CNN, Fox News, and the Trump-friendly One America News Network.

The code for getting tweet data and then scraping article text is contained in get_data.py. To run the code, Twitter API keys are required (not incuded in this repo).

The get_data.py script does two main things when it is run:
* Get tweets containing search text
* Scrape text content of articles from those tweets

Each of these processes generates messages in the terminal noting how many tweets were found and how many articles were scraped. The specific steps are as follows:

* Get tweets by the five organizations containing URLs linking to those organizations’ websites. The query can include specified search text and whether tweets should be required to contain URLs.
* Print results, accounting for the pagination of Twitter’s results and printing a warning in the terminal if there are uncaught results.
* Aggregate and store the tweet data.
* Scrape the article titles and paragraphs for the URLs included in the tweets, using the appropriate scraping method depending on the organization’s website structure.
* Filter to just those articles that have unique URLs, taking into account URL redirects.
* Aggregate number of Twitter likes for each URL.
* Write out the results for visualization.

I decided to include all of these in a single script (get_data.py). This is less flexible when working on one aspect of the code at a time, but is very helpful for experimenting with different search terms, becuase it allows for getting tweets and article content with a single function call, making it easier to try different search terms. My project analyzed political news coverage but the script can be used to scrape article content on whatever search text. 

After running get_data.py, the output data files (in the output folder) can be passed into the d3.json function in index.html to change what data is visualized in the webpage.

The text_analysis.py script is unfinished and not currenty in use.

### Results

I used the resulting data to make this front end display using D3.js. While the data files generated often contain large numbers of articles, the interface shows only the top three articles for four of the five organizations to allow for easier comparison by the user. Additionally, while the script collects the full article text, the front end display only shows the headline and first paragraph of each.

The dropdown can be used to explore data for different search topics.

![An image of the front end display of the results from the web scraping](https://github.com/wmerrow/pfch-media-analysis/blob/master/screenshot.png)

### Reflection

Overall, this project was a good way to become more familiar with using an API and with web scraping. The most challenging aspects for me were working with complex data structures and determining how to set up the script, particularly looping through different objects and accomplishing different types of tasks. 

Next steps would be to conduct text analysis in order to compare which words were used more or less frequently by the different news organizations.
