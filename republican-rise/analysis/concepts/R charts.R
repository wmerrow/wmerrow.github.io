

# VISUALIZATION

# dataframe for visualization
allv <- all
allv <- arrange(allv, desc(state))

# create categorical variable for govt control
allv$government_cont_cat[allv$government_cont > 0.99] <- "Full D control"
allv$government_cont_cat[allv$government_cont < 0.01] <- "Full R control"
#allv$government_cont_cat[allv$government_cont > 0.01 & allv$government_cont < 0.99] <- "Split"
allv$government_cont_cat[allv$government_cont < 0.99 & allv$government_cont > 0.5] <- "Partial D control"
allv$government_cont_cat[allv$government_cont > 0.01 & allv$government_cont < 0.5] <- "Partial R control"
allv$government_cont_cat[allv$government_cont == 0.5] <- "Even"

# set factor level order
allv$government_cont_cat <- factor(allv$government_cont_cat, levels = c("Full D control", "Partial D control", "Even", "Partial R control", "Full R control"))

# stacked bars
bars <- ggplot(allv, aes(fill=government_cont_cat, y=pop, x=year)) + 
  #geom_bar(position="stack", stat="identity")
  geom_bar(position="fill", stat="identity") 

bars + scale_fill_manual(values=c("#0571b0", "#92c5de", "#cccccc", "#f4a582", "#ca0020"))

# stacked bars by state
bars <- ggplot(allv, aes(fill=government_cont, color=government_cont, y=pop, x=year)) + 
  geom_bar(position="stack", stat="identity")
#geom_bar(position="fill", stat="identity") 

bars + scale_fill_gradient2(
  low = "#ca0020",
  mid = "#cccccc",
  high = "#0571b0",
  midpoint = 0.5
) + scale_color_gradient(
  low = "white",
  high = "white"
)