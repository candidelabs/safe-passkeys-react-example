--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.18 (Ubuntu 14.18-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: myapp_user
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    account_address character varying NOT NULL,
    "timestamp" timestamp(6) without time zone DEFAULT now() NOT NULL,
    pubkey_coordinates jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    pubkey_id character varying,
    username character varying(255)
);


ALTER TABLE public.users OWNER TO myapp_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: myapp_user
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO myapp_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: myapp_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: myapp_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: myapp_user
--

COPY public.users (id, account_address, "timestamp", pubkey_coordinates, created_at, updated_at, pubkey_id, username) FROM stdin;
103	0xDEADBEEF1234	2025-07-22 17:37:46.993322	{"x": "0x1a2b3c", "y": "0x4d5e6f"}	2025-07-22 17:37:46.996143	2025-07-22 17:37:46.996143	test-key-1	SmokeTester
104	0xCBcB28bD98f4CF7834e5054346abe4DdabCda5aE	2025-07-22 17:59:05.199487	{"x": "0x7e64ebcc588993f44d9ea1717d0741151382052a7d66c55005ad551cc31191e3", "y": "0x608045f4b04ac66d66433a245c6762403908e20bc2937e5f1538ac889182cc5"}	2025-07-22 17:59:05.201022	2025-07-22 17:59:05.201022	8XxLAHR-SLe5UCqUkyFmMA	Rani
105	0xf13F870c36e21eBb785719fA651322d5E8898189	2025-07-22 18:41:43.572242	{"x": "0xff1f1521220200ca877a147d3b5df821eba7a7d24c960bb84e10e9755fa6ebe0", "y": "0x2ea0d68c8b7c7811b83d209e2e6210ffb9dc34d2e1871b825938ad7538ea7702"}	2025-07-22 18:41:43.573905	2025-07-22 18:41:43.573905	QG8nb32HSm6v9OdJflpDGA	Thomas
106	0x36a8Cc0Fdd102cCeF10c203603546F156398A4fb	2025-07-22 19:07:25.474482	{"x": "0xc9239298e4a1903b3d17e509c336f1cc67c65606cffc37d5bf49a5eb5d0ecb34", "y": "0xe20ab0624a33909c5751872079e017b06f2ae77560c795876c546347ecc437ce"}	2025-07-22 19:07:25.476791	2025-07-22 19:07:25.476791	g2La4sSaTM65zRwLzULfOw	chris
107	0x8C14C0AD87376444f50615A10A9454947800d9F0	2025-07-22 19:08:06.718759	{"x": "0xbefa98296a82be3e56118749bab2568aa7fc548ff424d995f42bf4e2f4590ee3", "y": "0x80b0838d3bfa1f858becae62ad0ec45affab4918388b98ab8675d23a4ff1f220"}	2025-07-22 19:08:06.720395	2025-07-22 19:08:06.720395	bdTYnkCWT_CQfUGNsEXiZA	Rani
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: myapp_user
--

SELECT pg_catalog.setval('public.users_id_seq', 107, true);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: myapp_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: index_users_on_pubkey_coordinates; Type: INDEX; Schema: public; Owner: myapp_user
--

CREATE INDEX index_users_on_pubkey_coordinates ON public.users USING gin (pubkey_coordinates);


--
-- PostgreSQL database dump complete
--

