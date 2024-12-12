import { expect } from "@std/expect";
import { toJson } from "@std/streams/to-json";

import { getUrlPatternResult } from "./test_utils.ts";
import {
  defaultHandler,
  deleteHandler,
  getHandler,
  postHandler,
  putHandler,
} from "./handlers.ts";
import type { Todo } from "./types.ts";

Deno.test("postHandler()", async (t) => {
  const kv = await Deno.openKv(":memory:");

  await t.step(
    "sends an error if there is no request body",
    async () => {
      const request = new Request("http://localhost:3000/todos", {
        method: "POST",
      });
      const response = await postHandler(request, kv);
      const body = await toJson(response.body!) as { error: string };
      expect(body.error).toBe("O corpo da requisição está ausente");
    },
  );

  await t.step("sends an error if the body is invalid", async () => {
    const request = new Request("http://localhost:3000/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Estudar Deno", isCompleted: false }),
    });
    const response = await postHandler(request, kv);
    const body = await toJson(response.body!) as { error: string };
    expect(body.error).toBe("O corpo da requisição está inválido");
  });

  await t.step("creates a todo correctly", async () => {
    const request = new Request("http://localhost:3000/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Estudar Deno", completed: false }),
    });
    const response = await postHandler(request, kv);
    const body = await toJson(response.body!) as {
      message: string;
      data: Todo;
    };
    expect(body.message).toBe("A tarefa foi criada com sucesso");
    expect(body.data.data).toEqual({
      text: "Estudar Deno",
      completed: false,
    });
  });

  kv.close();
});

Deno.test("getHandler()", async (t) => {
  const kv = await Deno.openKv(":memory:");
  const request = new Request("http://localhost:3000/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Estudar Deno", completed: false }),
  });
  const response = await postHandler(request, kv);
  const body = await toJson(response.body!) as {
    message: string;
    data: Todo;
  };
  const todoId = body.data.id;

  await t.step(
    "sends an empty array if there is no 'id' in the pathname",
    async () => {
      const request = new Request("http://localhost:3000/todos", {
        method: "GET",
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await getHandler(urlPatternResult, kv);
      const body = await toJson(response.body!) as { data: Todo[] };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
    },
  );

  await t.step(
    "sends an error if there is no todo associated to the 'id' in the pathname",
    async () => {
      const request = new Request("http://localhost:3000/todos/123", {
        method: "GET",
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await getHandler(urlPatternResult, kv);
      const body = await toJson(response.body!) as { error: string };
      expect(body.error).toBe("Nenhum tarefa encontrada");
    },
  );

  await t.step(
    "gets the todo associated to the 'id' in the pathname and sends it",
    async () => {
      const request = new Request(`http://localhost:3000/todos/${todoId}`, {
        method: "GET",
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await getHandler(urlPatternResult, kv);
      const body = await toJson(response.body!) as { data: Todo };
      expect(body.data.id).toBe(todoId);
      expect(body.data.data.text).toBe("Estudar Deno");
      expect(body.data.data.completed).toBe(false);
    },
  );

  kv.close();
});

Deno.test("putHandler()", async (t) => {
  const kv = await Deno.openKv(":memory:");
  const request = new Request("http://localhost:3000/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Estudar Deno", completed: false }),
  });
  const response = await postHandler(request, kv);
  const body = await toJson(response.body!) as {
    message: string;
    data: Todo;
  };
  const todoId = body.data.id;

  await t.step(
    "sends an error if there is no 'id' in the pathname",
    async () => {
      const request = new Request("http://localhost:3000/todos", {
        method: "PUT",
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await putHandler(request, urlPatternResult, kv);
      const body = await toJson(response.body!) as { error: string };
      expect(body.error).toBe("O 'id' da tarefa não foi fornecido");
    },
  );

  await t.step(
    "sends an error if there is no request body",
    async () => {
      const request = new Request(`http://localhost:3000/todos/${todoId}`, {
        method: "PUT",
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await putHandler(request, urlPatternResult, kv);
      const body = await toJson(response.body!) as { error: string };
      expect(body.error).toBe("O corpo da requisição está ausente");
    },
  );

  await t.step(
    "sends an error if the request body is invalid",
    async () => {
      const request = new Request(`http://localhost:3000/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Estudar Deno", isCompleted: true }),
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await putHandler(request, urlPatternResult, kv);
      const body = await toJson(response.body!) as { error: string };
      expect(body.error).toBe("O corpo da requisição está inválido");
    },
  );

  await t.step(
    "updates a todo correctly",
    async () => {
      const request = new Request(`http://localhost:3000/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Estudar Deno", completed: true }),
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await putHandler(request, urlPatternResult, kv);
      const body = await toJson(response.body!) as {
        message: string;
        data: Todo;
      };
      expect(body.message).toBe("A tarefa foi atualizada com sucesso");
      expect(body.data.id).toBe(todoId);
      expect(body.data.data).toEqual({
        text: "Estudar Deno",
        completed: true,
      });
    },
  );

  kv.close();
});

Deno.test("deleteHandler()", async (t) => {
  const kv = await Deno.openKv(":memory:");
  const request = new Request("http://localhost:3000/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Estudar Deno", completed: false }),
  });
  const response = await postHandler(request, kv);
  const body = await toJson(response.body!) as {
    message: string;
    data: Todo;
  };
  const todoId = body.data.id;

  await t.step(
    "sends an error if there is no 'id' in the pathname",
    async () => {
      const request = new Request("http://localhost:3000/todos", {
        method: "DELETE",
      });
      const urlPatternResult = getUrlPatternResult(request.url);
      const response = await deleteHandler(urlPatternResult, kv);
      const body = await toJson(response.body!) as { error: string };
      expect(body.error).toBe("O 'id' da tarefa não foi fornecido");
    },
  );

  await t.step("deletes a todo correctly", async () => {
    const request = new Request(`http://localhost:3000/todos/${todoId}`, {
      method: "DELETE",
    });
    const urlPatternResult = getUrlPatternResult(request.url);
    const response = await deleteHandler(urlPatternResult, kv);
    const body = await toJson(response.body!) as { message: string };
    expect(body.message).toBe("A tarefa foi deletada com sucesso");
  });

  kv.close();
});

Deno.test("defaultHandler()", async (t) => {
  await t.step("sends an error for unexpected cases", async () => {
    const response = defaultHandler();
    const body = await toJson(response.body!) as { error: string };
    expect(body.error).toBe("O recurso não foi encontrado");
  });
});