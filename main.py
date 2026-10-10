
import os
from contextlib import contextmanager
from typing import Optional

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing. Create a .env file.")

app = FastAPI(title="Customer CRUD API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@contextmanager
def get_connection():
    with psycopg.connect(
        DATABASE_URL, row_factory=dict_row
    ) as conn:
        yield conn


class CustomerInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    address_line1: str = Field(min_length=1, max_length=150)
    address_line2: Optional[str] = Field(
        default=None, max_length=150
    )
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=50)
    zip: str = Field(min_length=1, max_length=10)


@app.get("/")
def home():
    return {"message": "Customer CRUD API is running"}


@app.get("/customers")
def get_customers():
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM customer ORDER BY customer_id"
        ).fetchall()


@app.get("/customers/{customer_id}")
def get_customer(customer_id: int):
    with get_connection() as conn:
        customer = conn.execute(
            "SELECT * FROM customer WHERE customer_id = %s",
            (customer_id,)
        ).fetchone()

    if customer is None:
        raise HTTPException(404, "Customer not found")

    return customer


@app.post("/customers", status_code=201)
def create_customer(customer: CustomerInput):
    with get_connection() as conn:
        return conn.execute(
            """
            INSERT INTO customer
                (name, address_line1, address_line2,
                 city, state, zip)
            VALUES
                (%(name)s, %(address_line1)s,
                 %(address_line2)s, %(city)s,
                 %(state)s, %(zip)s)
            RETURNING *
            """,
            customer.model_dump()
        ).fetchone()


@app.put("/customers/{customer_id}")
def update_customer(
    customer_id: int, customer: CustomerInput
):
    with get_connection() as conn:
        updated = conn.execute(
            """
            UPDATE customer
            SET name = %(name)s,
                address_line1 = %(address_line1)s,
                address_line2 = %(address_line2)s,
                city = %(city)s,
                state = %(state)s,
                zip = %(zip)s
            WHERE customer_id = %(customer_id)s
            RETURNING *
            """,
            {
                **customer.model_dump(),
                "customer_id": customer_id
            }
        ).fetchone()

    if updated is None:
        raise HTTPException(404, "Customer not found")

    return updated


@app.delete("/customers/{customer_id}", status_code=204)
def delete_customer(customer_id: int):
    with get_connection() as conn:
        deleted = conn.execute(
            """
            DELETE FROM customer
            WHERE customer_id = %s
            RETURNING customer_id
            """,
            (customer_id,)
        ).fetchone()

    if deleted is None:
        raise HTTPException(404, "Customer not found")

    return Response(status_code=204)
