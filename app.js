const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
var parseISO = require("date-fns/parseISO");

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is starting at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//middleware function for query parameters
const requestQuery = async (request, response, next) => {
  const { search_q, priority, status, category, date } = request.query;
  const { todoId } = request.params;

  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    const checkPriority = priorityArray.includes(priority);
    if (checkPriority === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }

  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    const checkStatus = statusArray.includes(status);
    if (checkStatus === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }

  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    const checkCategory = categoryArray.includes(category);
    if (checkCategory === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  }

  if (date !== undefined) {
    const myDate = new Date(date);
    const formatDate = format(new Date(myDate), "yyyy-MM-dd");
    //to parse the date
    const result = parseISO(
      `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
    );
    const isValidDate = await isValid(result);
    if (isValidDate !== undefined) {
      request.date = formatDate;
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }

  request.todoId = todoId;
  request.search_q = search_q;
  next();
};

const requestBody = async (request, response, next) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const { todoId } = request.params;

  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    const checkPriority = priorityArray.includes(priority);
    if (checkPriority === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  }

  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    const checkStatus = statusArray.includes(status);
    if (checkStatus === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  }

  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    const checkCategory = categoryArray.includes(category);
    if (checkCategory === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formatDate = format(new Date(myDate), "yyyy-MM-dd");
      const result = parseISO(formatDate);
      const isValidDate = await isValid(result);
      if (isValidDate !== undefined) {
        request.dueDate = formatDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    } catch {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }

  request.id = id;
  request.todo = todo;
  request.todoId = todoId;
  next();
};

//Get all todos based on todo id

app.get("/todos/", requestQuery, async (request, response) => {
  const { search_q = "", status = "", priority = "", category = "" } = request;
  const getTodosQuery = `
        SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate 
        FROM 
            todo
        WHERE 
        todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' 
        AND status LIKE '%${status}%' AND category LIKE '%${category}%';`;

  const todosArray = await db.all(getTodosQuery);
  response.send(todosArray);
});

//get a todo based on todo id
app.get("/todos/:todoId/", requestQuery, async (request, response) => {
  const { todoId } = request;
  const todoQuery = `
    SELECT 
    id,
    todo,
    priority,
    status,
    category,
    due_date AS dueDate
    FROM 
    todo
    WHERE
    todo.id = ${todoId};`;
  const dbTodo = await db.get(todoQuery);
  response.send(dbTodo);
});

//get todos based on date
app.get("/agenda/", requestQuery, async (request, response) => {
  const { date } = request;
  const getDateQuery = `SELECT * FROM todo WHERE due_date='${date}';`;
  const dbDate = await db.get(getDateQuery);
  if (dbDate === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(dbDate);
  }
});

//create a todo in todo table
app.post("/todos/", requestBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;
  const createQuery = `
  INSERT INTO
  todo (id, todo, priority, status, category, due_date)
  VALUES (
      ${id},
      '${todo}',
      '${priority}',
      '${status}',
      '${category}',
      '${dueDate}'
  );`;
  const todoLast = await db.run(createQuery);
  response.send("Todo Successfully Added");
});

//update a todo.
app.put("/todos/:todoId/", requestBody, async (request, response) => {
  const { todoId } = request;
  const requestBody = request;
  let updateQuery;
  let updateTodo = "";
  switch (true) {
    case requestBody.status !== undefined:
      updateTodo = "Status";
      break;
    case requestBody.priority !== undefined:
      updateTodo = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateTodo = "Todo";
      break;
    case requestBody.category !== undefined:
      updateTodo = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateTodo = "Due Date";
      break;
  }
  const getIdQuery = `SELECT * FROM todo WHERE todo.id=${todoId};`;
  const getTodoId = await db.get(getIdQuery);
  const {
    todo = getTodoId.todo,
    priority = getTodoId.priority,
    status = getTodoId.status,
    category = getTodoId.category,
    dueDate = getTodoId.dueDate,
  } = request;
  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category='${category}',
      due_date = '${dueDate}'
    WHERE
      id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updateTodo} Updated`);
});

//Delete todo based on todo id
app.delete("/todos/:todoId/", requestBody, async (request, response) => {
  const { todoId } = request;
  const deleteQuery = `
    DELETE FROM todo
    WHERE todo.id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});
module.exports = app;
