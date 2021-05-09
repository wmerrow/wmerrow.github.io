rm(list = ls(all = TRUE))

library(dplyr)
library(reshape2)
library(ggplot2)
library(tidyr)
library(stringr)
#library(RColorBrewer)
#library(foreign)

# PARTY CONTROL (1934-2015 although blank after 2011)

pc1 <- read.csv(file = "data/source/party_control/Partisan_Balance_For_Use2011_06_09b.csv", header = TRUE, stringsAsFactors = FALSE)
str(pc1)

# select desired party control columns
pc1 <- pc1 %>% select(year,
                      state,
                      fips,
                      # party control of legislature (1=dem, 0=rep, .5=split)
                      sen_cont_alt,
                      hs_cont_alt,
                      # party proportion of seats controlled in legislature
                      sen_dem_prop_all,
                      sen_rep_prop_all,
                      hs_dem_prop_all,
                      hs_rep_prop_all,
                      # governor party (1=dem, 0=rep, .5=other)
                      govparty_c,
                      # trifecta control
                      government_cont
)
str(pc1)

# filter to desired years
pc1 <- pc1 %>% filter(year >= 1977)
pc1 <- pc1 %>% filter(year <= 2011)


# PARTY CONTROL (2012-2021)

pc2 <- read.csv(file = "data/source/party_control/ncsl_pdfs.csv", header = TRUE, stringsAsFactors = FALSE)
str(pc2)

# columns are concatenated as text after pasting from PDFs
# need to split on spaces so need to standardize spaces

# remove spaces in state names
pc2$text <- gsub("New ", "New_", pc2$text)
pc2$text <- gsub("North ", "North_", pc2$text)
pc2$text <- gsub("South ", "South_", pc2$text)
pc2$text <- gsub("Rhode ", "Rhode_", pc2$text)
pc2$text <- gsub("West ", "West_", pc2$text)
# remove asterisks in state names
pc2$text <- gsub("\\*", "", pc2$text)
# Nebraska has unicameral legislature with 49 nonpartisan senators
# change all Nebraska rows to be the same
pc2$text[substr(pc2$text, 1, 8) == "Nebraska"] <- "Nebraska NA NA NA NA NA NA NA NA NA NA Rep NA"
# fix "e"s
pc2$text <- gsub(" e ", " ", pc2$text)
# fix commas
pc2$text <- gsub(", ", ",", pc2$text)

# assign columns. some cells in PDFs were blank, so need special handling for those

# split on spaces
pc2$text <- strsplit(pc2$text, " ", fixed = TRUE)

# use sapply to iterate over list items and a function to extract the desired one
pc2$state <- sapply(pc2$text, function(x) x[1])
pc2$sen_seats <- sapply(pc2$text, function(x) as.integer(x[3]))
pc2$sen_seats_D <- sapply(pc2$text, function(x) as.integer(x[4]))
pc2$sen_seats_R <- sapply(pc2$text, function(x) as.integer(x[5]))

# determine if items are offset
pc2$item6 <- sapply(pc2$text, function(x) as.integer(x[6]))
pc2$item6_offset <- FALSE
pc2$item6_offset[pc2$item6 > 20] <- TRUE

# use a different column if offset
pc2$hs_seats[pc2$item6_offset == TRUE] <- sapply(pc2$text[pc2$item6_offset == TRUE], function(x) as.integer(x[6]))
pc2$hs_seats[pc2$item6_offset == FALSE] <- sapply(pc2$text[pc2$item6_offset == FALSE], function(x) as.integer(x[7]))
pc2$hs_seats_D[pc2$item6_offset == TRUE] <- sapply(pc2$text[pc2$item6_offset == TRUE], function(x) as.integer(x[7]))
pc2$hs_seats_D[pc2$item6_offset == FALSE] <- sapply(pc2$text[pc2$item6_offset == FALSE], function(x) as.integer(x[8]))
pc2$hs_seats_R[pc2$item6_offset == TRUE] <- sapply(pc2$text[pc2$item6_offset == TRUE], function(x) as.integer(x[8]))
pc2$hs_seats_R[pc2$item6_offset == FALSE] <- sapply(pc2$text[pc2$item6_offset == FALSE], function(x) as.integer(x[9]))

# gov party uses reversed list to get second from last item, so we don't have to worry about house offsets
pc2$governor <- sapply(pc2$text, function(x) rev(x)[2]) 

# create columns that match pc1

# party proportion of seats controlled in legislature
pc2$sen_dem_prop_all <- pc2$sen_seats_D / pc2$sen_seats
pc2$sen_rep_prop_all <- pc2$sen_seats_R / pc2$sen_seats
pc2$hs_dem_prop_all <- pc2$hs_seats_D / pc2$hs_seats
pc2$hs_rep_prop_all <- pc2$hs_seats_R / pc2$hs_seats

# party control of legislature (1=dem, 0=rep, .5=split)
# (split if both parties have 0.5 or less, due to inds, vacancies, etc)
pc2$sen_cont_alt[pc2$sen_dem_prop_all > 0.5] <- 1.0
pc2$sen_cont_alt[pc2$sen_rep_prop_all > 0.5] <- 0.0
pc2$sen_cont_alt[pc2$sen_dem_prop_all <= 0.5 & pc2$sen_rep_prop_all <= 0.5] <- 0.5
pc2$hs_cont_alt[pc2$hs_dem_prop_all > 0.5] <- 1.0
pc2$hs_cont_alt[pc2$hs_rep_prop_all > 0.5] <- 0.0
pc2$hs_cont_alt[pc2$hs_dem_prop_all <= 0.5 & pc2$hs_rep_prop_all <= 0.5] <- 0.5

# governor party (1=dem, 0=rep, .5=other)
pc2$govparty_c[pc2$governor == "Dem"] <- 1.0
pc2$govparty_c[pc2$governor == "Rep"] <- 0.0
pc2$govparty_c[pc2$governor == "Ind"] <- 0.5

# trifecta control (averaging together three institution control scores, so 1=dem control three, 0=rep control three, 0.33=dem control one, etc)
pc2$government_cont <- (pc2$sen_cont_alt + pc2$hs_cont_alt + pc2$govparty_c) / 3

# join with fips
fips <- read.csv(file = "data/source/party_control/fips.csv", header = TRUE, stringsAsFactors = FALSE)
str(fips)
pc2 <- left_join(pc2, fips, by = "state")
str(pc2)

# restore spaces in state names
pc2$state <- gsub("_", " ", pc2$state)

# select desired columns (same as pc1)
pc2 <- pc2 %>% select(year,
                      state,
                      fips,
                      # party control of legislature (1=dem, 0=rep, .5=split)
                      sen_cont_alt,
                      hs_cont_alt,
                      # party proportion of seats controlled in legislature
                      sen_dem_prop_all,
                      sen_rep_prop_all,
                      hs_dem_prop_all,
                      hs_rep_prop_all,
                      # governor party (1=dem, 0=rep, .5=other)
                      govparty_c,
                      # trifecta control
                      government_cont
)
str(pc2)


# PARTY CONTROL (COMBINED)

# combine pc1 and pc2
pc <- rbind(pc1, pc2)

# add text field for gov control
pc$cont_text[pc$government_cont > 0.99] <- "full_dem"
pc$cont_text[pc$government_cont < 0.01] <- "full_rep"
pc$cont_text[pc$government_cont < 0.99 & pc$government_cont > 0.01] <- "split"
#pc$cont_text[pc$government_cont < 0.8 & pc$government_cont > 0.5] <- "lean_dem"
#pc$cont_text[pc$government_cont > 0.2 & pc$government_cont < 0.5] <- "lean_rep"
### could fix above to handle edge cases resulting from tie in legislature (.83, .16, .5)

# sort by year and state
pc <- arrange(pc, state, year)

# add col for control in previous year
pc <- pc %>%
  group_by(state) %>%
  mutate(cont_text_prev_yr = lag(cont_text, order_by = state)) # apparently need to sort first or include order_by or this will not give correct results
str(pc)

# add col for whether control flipped
pc$cont_flip[pc$cont_text == pc$cont_text_prev_yr] <- FALSE
pc$cont_flip[pc$cont_text != pc$cont_text_prev_yr] <- TRUE


# POPULATION (1969-2010)

pop1 <- read.csv(file = "data/source/pop/popest-annual-historical_WM_formatted.csv", header = TRUE, stringsAsFactors = FALSE)
str(pop1)

# melt pop1 data to long format
pop1 <- melt(data = pop1, id.vars = c("Fips", "Area.Name"))
str(pop1)

# change column names
colnames(pop1) <- c("fips", "state", "year", "pop")
str(pop1)


# POPULATION (2010-2020)

pop2 <- read.csv(file = "data/source/pop/nst-est2020_WM_formatted.csv", header = TRUE, stringsAsFactors = FALSE)
str(pop2)

# melt pop2 data to long format
pop2 <- melt(data = pop2, id.vars = c("fips", "state"))
str(pop2)

# change column names
colnames(pop2) <- c("fips", "state", "year", "pop")
str(pop2)


# POPULATION (2021)

pop3 <- read.csv(file = "data/source/pop/dummy_2021_pop.csv", header = TRUE, stringsAsFactors = FALSE)
str(pop3)

# melt pop3 data to long format
pop3 <- melt(data = pop3, id.vars = c("fips", "state"))
str(pop3)

# change column names
colnames(pop3) <- c("fips", "state", "year", "pop")
str(pop3)


# POPULATION (COMBINED)

# combine pop data
pop <- rbind(pop1, pop2)
pop <- rbind(pop, pop3)

# remove X from year and convert year to integer
pop$year <- as.character(pop$year)
pop$year <- gsub("X", "", pop$year)
pop$year <- as.integer(pop$year)
str(pop)

# select desired pop columns (remove state)
pop <- pop %>% select(year,
                      fips,
                      pop
)
str(pop)


# PRESIDENTIAL VOTE

pv <- read.csv(file = "data/source/pres_vote/1976-2020-president.csv", header = TRUE, stringsAsFactors = FALSE)
str(pv)

# filter to 2020 election
pv <- pv %>% filter(year == 2020)
# change year from 2020 to 2021 since years in other data represent year of session not year of election
pv$year <- pv$year + 1
pv$year <- as.integer(pv$year)
str(pv)
# select desired columns
pv <- pv %>% select(year,
                    state_fips,
                    party_simplified,
                    candidatevotes,
                    totalvotes
)
str(pv)
# calculate vote share
pv$pres_share <- pv$candidatevotes / pv$totalvotes
str(pv)
# create separate state-level dataframes for Rep and Dem (don't need other parties)
pvD <- pv %>% filter(party_simplified == "DEMOCRAT")
pvR <- pv %>% filter(party_simplified == "REPUBLICAN")
# select desired columns
pvD <- pvD %>% select(year,
                      state_fips,
                      pres_share
)
pvR <- pvR %>% select(year,
                      state_fips,
                      pres_share
)
# rename columns
colnames(pvD) <- c("year", "fips", "pres_share_dem")
colnames(pvR) <- c("year", "fips", "pres_share_rep")
# join Rep and Dem
pv <- left_join(pvD, pvR, by = c("fips", "year"))
str(pv)
# calculate Rep margin over Dem
pv$pres_marg_rep <- pv$pres_share_rep - pv$pres_share_dem


# COMBINE AND OUTPUT

# join party control and population by state and year
all <- left_join(pc, pop, by = c("fips", "year"))
str(all)

# join with pres vote by state and year
all <- left_join(all, pv, by = c("fips", "year"))
str(all)

# state abbreviations
sa <- read.csv(file = "data/source/abbreviations/state_abbreviations.csv", header = TRUE, stringsAsFactors = FALSE)
str(sa)

# join with state abbreviations
all <- left_join(all, sa, by = "state")
str(all)

# join with voting rights bill counts
vr <- read.csv(file = "data/source/voting_rights/voting_rights_brennan_bills.csv", header = TRUE, stringsAsFactors = FALSE)
str(vr)

# join with voting rights bill counts
all <- left_join(all, vr, by = "state_abbrev")
str(all)

# state x y positions
sp <- read.csv(file = "data/source/xy_positions/state_xy.csv", header = TRUE, stringsAsFactors = FALSE)
str(sp)

# join with state x y positions
all <- left_join(all, sp, by = "state")
str(all)


# aggregate to year level

# dataframe of all combinations of control and year
comb <- expand.grid(year = unique(all$year), cont_text = unique(all$cont_text))
comb$cont_text <- as.character(comb$cont_text)
# aggregate by control-year and calculate sum for each control-year
ag <- all
ag <- ag %>%
  group_by(year, cont_text) %>%
  summarise(pop = sum(pop))
# combinations that don't exist (full_rep in 1977 and 1978) don't have rows, so need to join with control-year combinations
ag <- left_join(comb, ag)
# change pop NAs (combinations that didn't exist) to zero
ag$pop[is.na(ag$pop)] <- 0
# aggregate by year and calculate sum for each year
ag_yr <- ag %>%
  group_by(year) %>%
  summarise(pop_yr = sum(pop))
# join control-year sums with year sums
ag <- left_join(ag, ag_yr, by = "year")
# calculate percent for each control-year
ag$pop_pct <- ag$pop / ag$pop_yr

# output
write.csv(all, "data/output/party_control.csv", row.names = FALSE)
write.csv(ag, "data/output/party_control_aggregated.csv", row.names = FALSE)
