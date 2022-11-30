#!/usr/bin/Rscript
library(tidyverse)
library(ggplot2)

data <- read.csv('group-summary.csv')
data <- data %>% mutate(Changes = Plus + Minus)
head(data)

p <- ggplot(data, aes(x=Layer, y=Group)) +
    geom_point(aes(size=Changes)) +
    annotate('text', x=7, y=data$Group, label=data$Changes, size=1.8, hjust=1) +
    expand_limits(x=7) +
    theme(axis.text = element_text(size = 5)) +
    labs(y='Function', x='')

ggsave('group-summary.png', p, dpi=300)

