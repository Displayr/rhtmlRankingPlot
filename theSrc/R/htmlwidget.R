#' rhtmlRankingPlot HTML Widget
#'
#' @description A HTMLWidget that creates a ranked order plot of the given input data.
#'
#' @section Usage Scenarios:
#'
#' Scenario 1: Blah blah
#'
#' @param param1 is a good param
#'
#' @examples
#'
#' rhtmlRankingPlot::RankingPlot('{}')
#'
#' @author Po Liu <po.liu@displayr.com>
#'
#' @source https://github.com/Displayr/rhtmlRankingPlot
#'
#' @import htmlwidgets
#'
#' @export
#'

RankingPlot <- function(settingsJsonString = '{}') {

  DEFAULT_WIDGET_WIDTH <- 600
  DEFAULT_WIDGET_HEIGHT <- 600

  parsedInput <- NULL
  parsedInput = tryCatch({
    jsonlite::fromJSON(settingsJsonString)
  }, warning = function(w) {
    print("warning while parsing JSON:")
    print(w)
  }, error = function(e) {
    print("error while parsing JSON:")
    print(e)
    stop(e)
  }, finally = {})

  width <- DEFAULT_WIDGET_WIDTH
  height <- DEFAULT_WIDGET_HEIGHT

  if('width' %in% names(parsedInput)) {
    width <- as.numeric(unlist(parsedInput['width']))
  }

  if('height' %in% names(parsedInput)) {
    height <- as.numeric(unlist(parsedInput['height']))
  }

  htmlwidgets::createWidget(
    name = 'rhtmlRankingPlot',
    settingsJsonString,
    width = width,
    height = height,
    sizingPolicy = htmlwidgets::sizingPolicy(
      defaultWidth = width,
      defaultHeight = height,
      browser.fill = TRUE,
      viewer.fill = TRUE,
      padding = 0
    ),
    package = 'rhtmlRankingPlot'
  )
}
