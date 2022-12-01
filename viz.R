#!/usr/bin/Rscript
library(tidyverse)
library(ggplot2)

data <- read.csv('changes-functional-summary.csv')
data <- data %>% mutate(Changes = Plus + Minus)
head(data)

p <- ggplot(data, aes(x=Changes, y=Group)) +
    geom_point(aes(color=Layer, shape=Todo)) +
    #annotate('text', x=7, y=data$Group, label=data$Changes, size=1.8, hjust=1) +
    #expand_limits(x=7) +
    theme(axis.text=element_text(size=5)) +
    theme(legend.position='none') +
    labs(y='Function', x='Changed Lines')

ggsave('changes-functional-summary.png', p, dpi=300)
