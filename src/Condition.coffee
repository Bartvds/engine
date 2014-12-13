Query = require('./Query')

class Condition extends Query
  type: 'Condition'
  
  signature: [
  	if: ['Query', 'Selector', 'Variable', 'Constraint', 'Default'],
  	then: ['Any'], 
  	[
  		else: ['Any']
  	]
  ]

  cleaning: true

  conditional: 1
  boundaries: true
  domains:
    1: 'solved'

  constructor: (operation, engine) ->
    @path = @key = @serialize(operation, engine)

    if @linked
      if parent = operation.parent
        previous = parent[parent.indexOf(operation) - 1]
        if command = previous.command
          if command.type == 'Condition'
            command.next = operation
            @previous = command

  # Condition was not evaluated yet
  descend: (engine, operation, continuation, scope) ->
    if @conditional
      path = continuation + @DESCEND + @key
      debugger
      unless engine.queries.hasOwnProperty(path)
        engine.queries[path] = undefined
        branch = operation[@conditional]
        branch.command.solve(engine, branch, path, scope)
      
      @after([], engine.queries[path], engine, operation, continuation + @DESCEND, scope)
        
    return false

  execute: (value) ->
    return value

  serialize: (operation, engine) ->
    return '@' + @toExpression(operation[1])

  ascend: (engine, operation, continuation, scope, result) ->
    old = engine.updating.collections[continuation]
    if !!old != !!result || (old == undefined && old != result)
      unless old == undefined
        @clean(engine, continuation, continuation, operation, scope)
      unless engine.switching
        switching = engine.switching = true

      if switching
        engine.triggerEvent('switch', operation, continuation)

        if engine.updating
          collections = engine.updating.collections
          engine.updating.collections = {}
          engine.updating.previous = collections

      index = @conditional + ((result ^ @inverted) && 1 || 2)
      engine.console.group '%s \t\t\t\t%o\t\t\t%c%s', (index == 2 && 'if' || 'else') + @DESCEND, operation[index], 'font-weight: normal; color: #999', continuation
      if branch = operation[index]
        result = engine.Command(branch).solve(engine, branch, @delimit(continuation, @DESCEND), scope)

      if switching
        engine.triggerEvent('switch', operation, true)
        engine.switching = undefined
      
      engine.console.groupEnd(continuation)

  # Capture commands generated by evaluation of arguments
  yield: (result, engine, operation, continuation, scope) ->
    # Condition result bubbled up, pick a branch
    if operation.parent.indexOf(operation) == -1
      if operation[0].key?
        continuation = operation[0].key
        if scoped = operation[0].scope
          scope = engine.identity[scoped]
      else
        continuation = @delimit(continuation, @DESCEND)
      @set(engine, continuation, result)
      @notify(engine, continuation, scope, result)

      #if continuation?
      #  @ascend(engine.document || engine.abstract, operation.parent[1], continuation, scope, undefined, result)
      

      return true

# Detect condition that only observes variables outside of current scope
Condition.Global = Condition.extend

  condition: (engine, operation, command) ->
    if command
      operation = operation[1]
    if operation[0] == 'get'
      if operation.length == 2 || operation[1][0] == '&'
        return false
    for argument in operation
      if argument && argument.push && @condition(engine, argument) == false
        return false
    return true



  global: true

Condition::advices = [Condition.Global]

Condition.define 'if', {}
Condition.define 'unless', {
  inverted: true
}
Condition.define 'else', {
  signature: [
    then: ['Any']
  ]

  linked: true

  conditional: null
  domains: null
}
Condition.define 'elseif', {
  linked: true
}
Condition.define 'elsif', {
}
 
module.exports = Condition