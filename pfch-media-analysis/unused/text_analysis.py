import json
import collections
# import nltk
# from nltk.corpus import stopwords

filenames = ['all_text__URL_True__Search_Trump',
'all_text__URL_True__Search_Biden',
'all_text__URL_True__Search_(Georgia OR GA OR Ga.) -runoff',
'all_text__URL_True__Search_(covid-19 OR covid OR coronavirus OR pandemic)',
'all_text__URL_True__Search_vaccine']

for filename in filenames:

	print('\n')
	print(filename)

	with open(f'output/articles/{filename}.json') as f:

		orgs_data = json.load(f)

		for org_data in orgs_data:

			org = org_data['org']
			org_text = org_data['org_text']

			print(org)

			# find relative frequency of words, removing stopwords

			# change to lower case and split on spaces
			words = org_text.lower().split()
			print(len(words))

			# words_unique = list(set(words))
			# print(len(words_unique))

			word_counts = collections.Counter(words)
			print(word_counts)
			print(len(word_counts))





