import requests
import json
from bs4 import BeautifulSoup


# TWITTER API SETUP

# get api keys from json file (in gitignore)
with open("keys.json") as f:
    keys = json.load(f)

btoken = keys['bearer_token']

endpoint_url = 'https://api.twitter.com/2/tweets/search/recent'

headers = {'Authorization': f'Bearer {btoken}'}


# LIST OF MEDIA ORGS

orgs = {
	'nyt': {
		'handle': 'nytimes',
		'url': 'https://www.nytimes.com/',
		'author_id': '807095'		
	},
	'vox': {
		'handle': 'voxdotcom',
		'url': 'https://www.vox.com/',
		'author_id': '2347049341'
	},
	'cnn': {
		'handle': 'cnn',
		'url': 'https://www.cnn.com/',
		'author_id': '759251'
	},
	'fox': {
		'handle': 'foxnews',
		'url': 'https://www.foxnews.com/',
		'author_id': '1367531'
	},
	'oan': {
		'handle': 'oann',
		'url': 'https://www.oann.com/',
		'author_id': '1209936918'
	}
}


# FUNCTION FOR GETTING DATA
# takes specific query parameters and gets tweets, then scrapes articles
# has_org_url specifies whether tweet should include a URL containing the org's URL
# search_text specifies term(s) to search for in the tweet text

def get_data(has_org_url, search_text):

	# print function inputs for reference
	print('\n\nGET DATA')
	print('url: ' + str(has_org_url))
	print('search text: ' + str(search_text))

	
	# 1. GET TWEETS

	print('\n\n1. get tweets')

	# empty variable for storing tweet data
	all_tweets = []

	# for each organization
	for org in orgs:

		# print org name
		print('\n', org, sep='')

		# define next_token as empty initially for each org - will be overwritten below if it isn't the first loop through
		next_token = None

		# reset result count for each org
		result_count = 0

		# create parameters for query string (tweets by the organization, containing the organization's URL if specified, containing the specified search words)

		# twitter handle parameter
		handle = orgs[org]['handle']
		handle_param = f'from:{handle}'

		# url parameter (if true was specified in function)
		url = orgs[org]['url']
		if has_org_url == False:
			url_param = ''
		else:
			url_param = f' url:"{url}"'
		
		# search text
		if search_text == None:
			search_text_param = ''
		else:
			search_text_param = f' {search_text}'

		# create query string
		query = handle_param + url_param + search_text_param

		# make requests, using next_token to combine multiple responses into one json file until there is no next token or max_results number of requests have been made

		# limit iterations to avoid hitting hitting request limit
		iterations = 4

		for i in range(1, iterations + 1):

			payload = {
				# query
				'query': query,
				# include these fields in response
				'tweet.fields': 'author_id,id,created_at,public_metrics,text,entities',
				# number of results per response (can be 10-100)
				'max_results': 100,
				# specify next_token (page to start on)
				'next_token': next_token
			}

			# make request
			r = requests.get(endpoint_url, params = payload, headers = headers)
			
			# print request status
			print('Response ', i, ': ', r.status_code, sep='')

			# store page of responses
			page_tweets = json.loads(r.text)

			# add to result count
			result_count = result_count + page_tweets['meta']['result_count']

			# if there are more than zero results
			if page_tweets['meta']['result_count'] > 0:

				# add new results to all_tweets, including data but not meta
				all_tweets = all_tweets + page_tweets['data']

			# if response contains a next token
			if 'next_token' in page_tweets['meta']:

				# store new next_token
				next_token = page_tweets['meta']['next_token']

				# and if it's the final iteration
				if i == iterations:

					# print number of results
					print(result_count, 'results')

					# print warning about uncaught results
					print('WARNING: Uncaught results (final iteration has next_token)')

			# if response does not contain next token
			else:

				# print number of results
				print(result_count, 'results')

				# print "no more results"
				print('No more results (response ', i, ' does not have next_token)', sep='')

				# end loop
				break

	# write tweet data as json file
	json.dump(all_tweets, open(f'output/tweets/tweets__URL_{has_org_url}__Search_{search_text}.json', 'w'), indent = 2)


	# 2. SCRAPE ARTICLES

	print('\n\n2. scrape articles')

	# empty lists for storing results
	articles = []
	text = []

	# loop through orgs
	for org in orgs: 

		# reset lists for org articles
		org_articles = []
		org_articles_unique = []

		# filter tweet data to just tweets by the current org
		org_tweets = [d for d in all_tweets if d['author_id'] == orgs[org]['author_id']]

		# print org name
		print(f'\n{org}')

		# go to each tweet URL and scrape the article text
		for tweet in org_tweets:

			# if there is a urls attribute
			if 'urls' in tweet['entities']:

				# URL in tweet ([0] assumes there will only ever be one url in the urls array)
				tweet_url = tweet['entities']['urls'][0]['expanded_url']

				# make request and store response
				article_response = requests.get(tweet_url)

				# store article URL (since tweet URLs are usually shortened URLs and multiple redirect to the same end URL)
				# split on '?' since some URLs have additional parameters but go to the same article
				article_url = article_response.url.split('?')[0]

				# article page html
				article_soup = BeautifulSoup(article_response.text, features="html.parser")

				# store headline (assumes all orgs' pages have a title and it's the first h1 on the page)
				h1_list = article_soup.find_all('h1')
				if len(h1_list) > 0:
					h1 = h1_list[0].text
				else:
					h1 = ''


				# store list of p tags, using the appropriate scraping approach depending on the org

				# reset p list
				p_list = []

				if org == 'nyt':
					
					# ignore articles with "transiton highlights" in the title
					### may be better to replace this with a check for live-blog classes since seems like there are other live blogs than just transition highlights
					if 'Transition Highlights: ' not in h1:

						p_container = article_soup.find('section', {'name': 'articleBody'})
						if p_container is not None:
							p_list = p_container.findAll('p')

				elif org == 'vox':

					# some articles have empty p tags at start, not a problem
					p_container = article_soup.find('div', {'class': 'c-entry-content'})
					if p_container is not None:
						p_list = p_container.findChildren('p', recursive=False) # recursive false specifies only direct children
				
				elif org == 'cnn':

					# could remove p tags with class zn-body__footer ("x y z contributed to this report...")
					p_container = article_soup.find('section', {'id': 'body-text'})
					if p_container is not None:
						p_list = p_container.findAll('p')

				elif org == 'fox':

					p_container = article_soup.find('div', {'class': 'article-body'})
					if p_container is not None:
						p_list = p_container.findChildren('p', recursive=False) # recursive false specifies only direct children

				elif org == 'oan':

					p_container = article_soup.find('div', {'class': 'entry-content'})
					if p_container is not None:
						p_list = p_container.findChildren('p', recursive=False) # recursive false specifies only direct children


				## these types of articles currently have empty p_lists:
				# CNN - https://www.cnn.com/politics/live-news/biden-trump-us-election-news-12-02-20/index.html
				# NYT - https://www.nytimes.com/live/2020/11/30/us/joe-biden-trump
				# seems like they are updated live so probably don't want to scrape them anyway
				# also videos that have no text, which is fine
				# also special things like this NYT quiz which seems fine - The Trump Administration Just Made the Citizenship Test Harder. How Would You Do? 

				# if p list is not empty, then add URL, headline, first paragraph, and article text to org list
				if len(p_list) > 0:

					# store first paragraph
					first_p = p_list[0].text

					# combine h1 and p list into article text
					article_text = h1
					for p in p_list:
						article_text = article_text + ' ' + p.text 

					# add to org's article list along with number of tweet likes
					org_articles.append({
						'org': org,
						'article_url': article_url,
						'h1': h1,
						'first_p': first_p,
						'article_text': article_text,
						'tweet_likes': tweet['public_metrics']['like_count']
						})	


		print(len(org_articles), 'total articles')


		# filter to just those that have unique article_urls

		# empty list for compiling running list of URLs as it loops through
		existing_urls = []

		# loop through articles
		for a in org_articles:

			# if the article's URL is not already in running list of URLs, add the article to the list of unique articles and then add the URL to the running list of URLs
			if a['article_url'] not in existing_urls:
				# note - could just append a instead of writing out each key value of a, but that would include tweet likes, which we want to leave out
				org_articles_unique.append({
					'org': a['org'],
					'article_url': a['article_url'],
					'h1': a['h1'],
					'first_p': a['first_p'],
					'article_text': a['article_text']
					})
				existing_urls.append(a['article_url'])


		# aggregate number of likes for each URL (engagement)

		# for each unique URL, loop through the list of org articles and sum likes for each article with a matching article URL
		for a_u in org_articles_unique:

			# reset URL likes sum
			url_likes = 0

			# loop through non-unique org articles 
			for a_nu in org_articles:

				# if current URL is current unique URL
				if a_nu['article_url'] == a_u['article_url']:

					# add URL's engagement to running sum of unique URL's engagement
					url_likes = url_likes + a_nu['tweet_likes']

			# add summed engagement key and value to current article dict
			a_u['url_likes'] = url_likes


		print(len(org_articles_unique), 'unique articles')

		# write output org articles (just for reference)
		#json.dump(org_articles_unique, open(f'output/articles/articles__URL_{has_org_url}__Search_{search_text}__{org}.json', 'w'), indent = 2)


		# add org list to list of all articles, to be written out
		articles = articles + org_articles_unique


		# combine article text from all of org's articles
		org_text = ''
		for a in org_articles_unique:
			org_text = org_text + a['article_text']

		# add org name and text to text list (for text analysis in separate script)
		text.append({
					'org': org,
					'org_text': org_text
					})


	print(len(articles), 'unique articles for all orgs')

	# write output
	json.dump(articles, open(f'output/articles/articles__URL_{has_org_url}__Search_{search_text}.json', 'w'), indent = 2)
	json.dump(text, open(f'output/articles/all_text__URL_{has_org_url}__Search_{search_text}.json', 'w'), indent = 2)

	# end get data function


# call function to get data
#get_data(has_org_url = True, search_text = None)
#get_data(has_org_url = True, search_text = 'Trump')
#get_data(has_org_url = True, search_text = 'Biden')
get_data(has_org_url = True, search_text = '(covid-19 OR covid OR coronavirus OR pandemic)')
get_data(has_org_url = True, search_text = 'vaccine')
get_data(has_org_url = True, search_text = '(Georgia OR GA OR Ga.) -runoff')
#get_data(has_org_url = True, search_text = '(Georgia OR GA OR Ga.) runoff')
#get_data(has_org_url = True, search_text = '(Georgia OR Ga. OR GA OR Arizona OR Pennsylvania OR Nevada) -runoff')

# unused:
#get_data(has_org_url = True, search_text = 'transition')
#get_data(has_org_url = True, search_text = 'election results')
#get_data(has_org_url = True, search_text = 'certify')
#get_data(has_org_url = True, search_text = 'Georgia')
#get_data(has_org_url = True, search_text = 'QAnon')
#get_data(has_org_url = True, search_text = 'pandemic')
#get_data(has_org_url = True, search_text = 'mask')
#get_data(has_org_url = True, search_text = 'economy')
#get_data(has_org_url = True, search_text = 'immigration')