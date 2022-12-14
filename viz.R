#!/usr/bin/Rscript
library(tidyverse)
library(ggplot2)

data <- read.csv('function-changes-summary.csv')

p <- ggplot(data, aes(x=Changes, y=Module)) +
    geom_point(aes(color=Layer, shape=Todo)) +
    theme(axis.text=element_text(size=5), legend.text=element_text(size=6), legend.title=element_text(size=8)) +
    labs(y='Function', x='Changed Lines')

ggsave('function-changes-summary.png', p, dpi=300)

p <- ggplot(data, aes(x=Score, y=Module)) +
    geom_point(aes(color=Layer, shape=Todo)) +
    theme(axis.text=element_text(size=5), legend.text=element_text(size=6), legend.title=element_text(size=8)) +
    labs(y='Function', x='Score')

ggsave('function-changes-rating.png', p, dpi=300)

