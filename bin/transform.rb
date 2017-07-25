#!/usr/bin/env ruby

require 'optparse'
require 'csv'
require 'json'

# Transforms CSV data into nested JSON
class Transform
  # field name => row #
  ROW_FORMAT = {
    category: 0,
    name: 7,
    funding: 8
  }.freeze

  def initialize(filename)
    @filename = filename
    @ran ||= false
  end

  def run
    CSV.foreach(@filename, headers: true, return_headers: true) do |row|
      next unless valid_row?(row)

      entry = process_entry(row)
      insert_entry(entry)
    end

    @ran = true
    data
  end

  def save!(filename)
    run unless @ran
    File.open(filename, 'w') { |f| f.write(data.to_json) }
  end

  private

  def valid_row?(row)
    !(row[-1].nil? || row[0].include?('textbox'))
  end

  def data
    @data ||= { name: '2017 Operating Budget', children: [] }
  end

  def insert_entry(entry)
    find_category(entry[:category])[:children].push(
      name: entry[:name],
      funding: entry[:funding].delete(',').to_i
    )
  end

  def find_category(category)
    data[:children].find(lambda do
      data[:children].push(name: category, children: []).last
    end) { |d| d[:name] == category }
  end

  def process_entry(row)
    Hash[ROW_FORMAT.map { |k, col| [k, row[col]] }]
  end
end

options = {}

OptionParser.new do |opts|
  opts.banner = 'Usage: transform.rb [options]'

  opts.on('-iFNAME', '--in=FNAME', 'Input file', :REQUIRED) do |filename|
    options[:input] = filename
  end

  opts.on('-oFNAME', '--out=FNAME', 'Output file', :REQUIRED) do |filename|
    options[:output] = filename
  end

  opts.on('-h', '--help', 'Print help') do
    puts opts
    exit
  end
end.parse!

Transform.new(options[:input]).save!(options[:output])
