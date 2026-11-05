#!/usr/bin/env ruby
# frozen_string_literal: true

require "yaml"

ROOT = File.expand_path("..", __dir__)
SPEC_PATH = File.join(ROOT, "docs", "backend", "openapi.yaml")
document = YAML.safe_load_file(SPEC_PATH, aliases: false)

def fail_contract(message)
  warn "OpenAPI contract validation failed: #{message}"
  exit 1
end

def resolve_pointer(document, ref)
  fail_contract("external or unsupported reference: #{ref}") unless ref.is_a?(String) && ref.start_with?("#/")
  ref.delete_prefix("#/").split("/").each do |segment|
    key = segment.gsub("~1", "/").gsub("~0", "~")
    document = document.is_a?(Hash) ? document[key] : nil
    fail_contract("unresolved reference: #{ref}") if document.nil?
  end
  document
end

def inspect_refs(value, document)
  case value
  when Hash
    resolve_pointer(document, value["$ref"]) if value.key?("$ref")
    value.each_value { |child| inspect_refs(child, document) }
  when Array
    value.each { |child| inspect_refs(child, document) }
  end
end

fail_contract("OpenAPI version must be 3.1.0") unless document["openapi"] == "3.1.0"
info = document["info"]
fail_contract("info.title and info.version are required") unless info.is_a?(Hash) && info["title"].is_a?(String) && info["version"].is_a?(String)
fail_contract("this repository must not advertise a live API server") unless
  document.fetch("servers", []).all? { |server| server["url"].to_s.include?(".invalid") }

components = document["components"] || {}
schemas = components["schemas"] || {}
responses = components["responses"] || {}
security_schemes = components["securitySchemes"] || {}
fail_contract("bearerAuth security scheme is required") unless security_schemes.dig("bearerAuth", "type") == "http" &&
  security_schemes.dig("bearerAuth", "scheme") == "bearer"

inspect_refs(document, document)

paths = document["paths"]
fail_contract("paths must be a non-empty object") unless paths.is_a?(Hash) && !paths.empty?
allowed_methods = %w[get post put patch delete options head]
operation_ids = []

paths.each do |path, path_item|
  fail_contract("path must start with /: #{path}") unless path.start_with?("/")
  fail_contract("path item must be an object: #{path}") unless path_item.is_a?(Hash)
  path_parameters = Array(path_item["parameters"])

  path_item.each do |method, operation|
    next unless allowed_methods.include?(method)
    fail_contract("#{method.upcase} #{path} must define an operation object") unless operation.is_a?(Hash)
    operation_id = operation["operationId"]
    fail_contract("#{method.upcase} #{path} is missing operationId") unless operation_id.is_a?(String) && !operation_id.empty?
    fail_contract("duplicate operationId: #{operation_id}") if operation_ids.include?(operation_id)
    operation_ids << operation_id

    operation_security = operation.key?("security") ? operation["security"] : document["security"]
    if path.start_with?("/me/")
      fail_contract("#{method.upcase} #{path} must require bearerAuth") unless
        operation_security.is_a?(Array) && operation_security.any? { |entry| entry.is_a?(Hash) && entry.key?("bearerAuth") }
    elsif path == "/health" || path == "/modules"
      fail_contract("#{method.upcase} #{path} must be explicitly public") unless operation_security == []
    end

    responses_map = operation["responses"]
    fail_contract("#{method.upcase} #{path} must define responses") unless responses_map.is_a?(Hash) && !responses_map.empty?

    declared_path_parameters = path_parameters + Array(operation["parameters"])
    declared_names = declared_path_parameters.select { |parameter| parameter["in"] == "path" }.map { |parameter| parameter["name"] }
    required_names = path.scan(/\{([^}]+)\}/).flatten
    missing_names = required_names - declared_names
    fail_contract("#{method.upcase} #{path} is missing path parameters: #{missing_names.join(", ")}") unless missing_names.empty?

    if %w[post put patch].include?(method)
      fail_contract("#{method.upcase} #{path} must require a request body") unless operation.dig("requestBody", "required") == true
    end
  end
end

fail_contract("operationIds must be unique") unless operation_ids.uniq.length == operation_ids.length
fail_contract("TaskUpdate must reject empty patches") unless schemas.dig("TaskUpdate", "minProperties").to_i >= 1
fail_contract("TaskCreate text must be bounded") unless schemas.dig("TaskCreate", "properties", "text", "maxLength").to_i == 120
fail_contract("Task schema must not accept a client-supplied owner ID") if schemas.values.any? { |schema| schema.is_a?(Hash) && (schema["properties"] || {}).key?("userId") }
fail_contract("ModuleCollection must cap pagination at 50 items") unless schemas.dig("ModuleCollection", "properties", "items", "maxItems").to_i == 50
fail_contract("TaskCollection must cap pagination at 100 items") unless schemas.dig("TaskCollection", "properties", "items", "maxItems").to_i == 100

create_task = paths.dig("/me/tasks", "post")
idempotency = Array(create_task && create_task["parameters"]).find { |parameter| parameter["name"] == "Idempotency-Key" }
fail_contract("task creation must require an Idempotency-Key") unless idempotency && idempotency["required"] == true

puts "OpenAPI contract valid: #{operation_ids.length} operations, #{paths.length} paths, #{schemas.length} schemas."
