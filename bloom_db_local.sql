PGDMP     '        
    	    
    y            bloom    14.0    14.0 #    0           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            1           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            2           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            3           1262    16384    bloom    DATABASE     Y   CREATE DATABASE bloom WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE = 'en_US.utf8';
    DROP DATABASE bloom;
                postgres    false                        3079    24576 	   uuid-ossp 	   EXTENSION     ?   CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
    DROP EXTENSION "uuid-ossp";
                   false            4           0    0    EXTENSION "uuid-ossp"    COMMENT     W   COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';
                        false    2            �            1259    24588 
   migrations    TABLE     �   CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);
    DROP TABLE public.migrations;
       public         heap    postgres    false            �            1259    24587    migrations_id_seq    SEQUENCE     �   CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public.migrations_id_seq;
       public          postgres    false    211            5           0    0    migrations_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;
          public          postgres    false    210            �            1259    24630    partner_access_entity    TABLE     8  CREATE TABLE public.partner_access_entity (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "activatedAt" timestamp without time zone,
    "featureLiveChat" boolean NOT NULL,
    "featureTherapy" boolean NOT NULL,
    "accessCode" character varying(6) NOT NULL,
    "therapySessionsRemaining" integer NOT NULL,
    "therapySessionsRedeemed" integer NOT NULL,
    "userId" uuid,
    "partnerId" uuid,
    "createdById" uuid
);
 )   DROP TABLE public.partner_access_entity;
       public         heap    postgres    false    2            �            1259    24620    partner_admin_entity    TABLE       CREATE TABLE public.partner_admin_entity (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "userId" uuid,
    "partnerId" uuid
);
 (   DROP TABLE public.partner_admin_entity;
       public         heap    postgres    false    2            �            1259    24596    partner_entity    TABLE     I  CREATE TABLE public.partner_entity (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    name character varying NOT NULL,
    logo character varying,
    "primaryColour" character varying
);
 "   DROP TABLE public.partner_entity;
       public         heap    postgres    false    2            �            1259    24606    user_entity    TABLE     �  CREATE TABLE public.user_entity (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "firebaseUid" character varying NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    "languageDefault" character varying NOT NULL
);
    DROP TABLE public.user_entity;
       public         heap    postgres    false    2            w           2604    24591    migrations id    DEFAULT     n   ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);
 <   ALTER TABLE public.migrations ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    210    211    211            )          0    24588 
   migrations 
   TABLE DATA           ;   COPY public.migrations (id, "timestamp", name) FROM stdin;
    public          postgres    false    211   0       -          0    24630    partner_access_entity 
   TABLE DATA           �   COPY public.partner_access_entity (id, "createdAt", "updatedAt", "activatedAt", "featureLiveChat", "featureTherapy", "accessCode", "therapySessionsRemaining", "therapySessionsRedeemed", "userId", "partnerId", "createdById") FROM stdin;
    public          postgres    false    215   �0       ,          0    24620    partner_admin_entity 
   TABLE DATA           c   COPY public.partner_admin_entity (id, "createdAt", "updatedAt", "userId", "partnerId") FROM stdin;
    public          postgres    false    214   �3       *          0    24596    partner_entity 
   TABLE DATA           c   COPY public.partner_entity (id, "createdAt", "updatedAt", name, logo, "primaryColour") FROM stdin;
    public          postgres    false    212   H4       +          0    24606    user_entity 
   TABLE DATA           r   COPY public.user_entity (id, "createdAt", "updatedAt", "firebaseUid", name, email, "languageDefault") FROM stdin;
    public          postgres    false    213   �4       6           0    0    migrations_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.migrations_id_seq', 1, true);
          public          postgres    false    210            �           2606    24627 3   partner_admin_entity PK_053db2d5da6c9a732993bbf6ef5 
   CONSTRAINT     s   ALTER TABLE ONLY public.partner_admin_entity
    ADD CONSTRAINT "PK_053db2d5da6c9a732993bbf6ef5" PRIMARY KEY (id);
 _   ALTER TABLE ONLY public.partner_admin_entity DROP CONSTRAINT "PK_053db2d5da6c9a732993bbf6ef5";
       public            postgres    false    214            �           2606    24605 -   partner_entity PK_3c0bb3b2afcb1923ed5425e5e43 
   CONSTRAINT     m   ALTER TABLE ONLY public.partner_entity
    ADD CONSTRAINT "PK_3c0bb3b2afcb1923ed5425e5e43" PRIMARY KEY (id);
 Y   ALTER TABLE ONLY public.partner_entity DROP CONSTRAINT "PK_3c0bb3b2afcb1923ed5425e5e43";
       public            postgres    false    212            �           2606    24595 )   migrations PK_8c82d7f526340ab734260ea46be 
   CONSTRAINT     i   ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);
 U   ALTER TABLE ONLY public.migrations DROP CONSTRAINT "PK_8c82d7f526340ab734260ea46be";
       public            postgres    false    211            �           2606    24637 4   partner_access_entity PK_9536c21fc956ec857c4d5ef51cc 
   CONSTRAINT     t   ALTER TABLE ONLY public.partner_access_entity
    ADD CONSTRAINT "PK_9536c21fc956ec857c4d5ef51cc" PRIMARY KEY (id);
 `   ALTER TABLE ONLY public.partner_access_entity DROP CONSTRAINT "PK_9536c21fc956ec857c4d5ef51cc";
       public            postgres    false    215            �           2606    24615 *   user_entity PK_b54f8ea623b17094db7667d8206 
   CONSTRAINT     j   ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT "PK_b54f8ea623b17094db7667d8206" PRIMARY KEY (id);
 V   ALTER TABLE ONLY public.user_entity DROP CONSTRAINT "PK_b54f8ea623b17094db7667d8206";
       public            postgres    false    213            �           2606    24641 4   partner_access_entity REL_713d3fd7cc1d63c926e98b876f 
   CONSTRAINT     u   ALTER TABLE ONLY public.partner_access_entity
    ADD CONSTRAINT "REL_713d3fd7cc1d63c926e98b876f" UNIQUE ("userId");
 `   ALTER TABLE ONLY public.partner_access_entity DROP CONSTRAINT "REL_713d3fd7cc1d63c926e98b876f";
       public            postgres    false    215            �           2606    24629 3   partner_admin_entity REL_7622b92e51ebdd0ee3a77651df 
   CONSTRAINT     t   ALTER TABLE ONLY public.partner_admin_entity
    ADD CONSTRAINT "REL_7622b92e51ebdd0ee3a77651df" UNIQUE ("userId");
 _   ALTER TABLE ONLY public.partner_admin_entity DROP CONSTRAINT "REL_7622b92e51ebdd0ee3a77651df";
       public            postgres    false    214            �           2606    24619 *   user_entity UQ_415c35b9b3b6fe45a3b065030f5 
   CONSTRAINT     h   ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT "UQ_415c35b9b3b6fe45a3b065030f5" UNIQUE (email);
 V   ALTER TABLE ONLY public.user_entity DROP CONSTRAINT "UQ_415c35b9b3b6fe45a3b065030f5";
       public            postgres    false    213            �           2606    24617 *   user_entity UQ_49078f34521b6bb5328396e971e 
   CONSTRAINT     p   ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT "UQ_49078f34521b6bb5328396e971e" UNIQUE ("firebaseUid");
 V   ALTER TABLE ONLY public.user_entity DROP CONSTRAINT "UQ_49078f34521b6bb5328396e971e";
       public            postgres    false    213            �           2606    24639 4   partner_access_entity UQ_f98c12f4abd111310ed15eb9666 
   CONSTRAINT     y   ALTER TABLE ONLY public.partner_access_entity
    ADD CONSTRAINT "UQ_f98c12f4abd111310ed15eb9666" UNIQUE ("accessCode");
 `   ALTER TABLE ONLY public.partner_access_entity DROP CONSTRAINT "UQ_f98c12f4abd111310ed15eb9666";
       public            postgres    false    215            �           2606    24657 4   partner_access_entity FK_700650980fa20fa2b2d29199598    FK CONSTRAINT     �   ALTER TABLE ONLY public.partner_access_entity
    ADD CONSTRAINT "FK_700650980fa20fa2b2d29199598" FOREIGN KEY ("partnerId") REFERENCES public.partner_entity(id);
 `   ALTER TABLE ONLY public.partner_access_entity DROP CONSTRAINT "FK_700650980fa20fa2b2d29199598";
       public          postgres    false    212    3207    215            �           2606    24652 4   partner_access_entity FK_713d3fd7cc1d63c926e98b876f6    FK CONSTRAINT     �   ALTER TABLE ONLY public.partner_access_entity
    ADD CONSTRAINT "FK_713d3fd7cc1d63c926e98b876f6" FOREIGN KEY ("userId") REFERENCES public.user_entity(id);
 `   ALTER TABLE ONLY public.partner_access_entity DROP CONSTRAINT "FK_713d3fd7cc1d63c926e98b876f6";
       public          postgres    false    3209    213    215            �           2606    24642 3   partner_admin_entity FK_7622b92e51ebdd0ee3a77651df8    FK CONSTRAINT     �   ALTER TABLE ONLY public.partner_admin_entity
    ADD CONSTRAINT "FK_7622b92e51ebdd0ee3a77651df8" FOREIGN KEY ("userId") REFERENCES public.user_entity(id);
 _   ALTER TABLE ONLY public.partner_admin_entity DROP CONSTRAINT "FK_7622b92e51ebdd0ee3a77651df8";
       public          postgres    false    214    213    3209            �           2606    24662 4   partner_access_entity FK_994dec156e9a32578bc531761e2    FK CONSTRAINT     �   ALTER TABLE ONLY public.partner_access_entity
    ADD CONSTRAINT "FK_994dec156e9a32578bc531761e2" FOREIGN KEY ("createdById") REFERENCES public.partner_admin_entity(id);
 `   ALTER TABLE ONLY public.partner_access_entity DROP CONSTRAINT "FK_994dec156e9a32578bc531761e2";
       public          postgres    false    214    3215    215            �           2606    24647 3   partner_admin_entity FK_b2a8240d70de9ba235015286f77    FK CONSTRAINT     �   ALTER TABLE ONLY public.partner_admin_entity
    ADD CONSTRAINT "FK_b2a8240d70de9ba235015286f77" FOREIGN KEY ("partnerId") REFERENCES public.partner_entity(id);
 _   ALTER TABLE ONLY public.partner_admin_entity DROP CONSTRAINT "FK_b2a8240d70de9ba235015286f77";
       public          postgres    false    214    212    3207            )   ,   x�3�4436314634725�L����uJL�N�KA������ 
�      -   �  x����nIE��Wd?`�,���]�vlؓ	������1T�ƥf#C�-���/oW�0��� d�y�����`|�xe�:�(;���������7�_~<���?ױjɜF�C��gH:��C��C���*�De�;�_�[��o�͝{��� ��A�d�{H��:�����ɋ�i=�[�o�����޽J�;�3H�j�B֐�BrZ�`�#�~��El$� ��zn���wU�/[�
�b� ����k?����E����n�nX�������� �%�(r#�ϝ�3��PhE]�QY��gu�g�I7���$�5"�d֑�������d�
�LW���A��Y���>�������#�4�X���:ș�rά͹zN�pqL�3y���?<^}��7�/Z)�nd[�-�A󰹦$Nf�hX1,Q"�;ǟ՗̺�J?/����i �V@4
��	�Ǝ�{��?���!��1p����U7�����A�T.yظ���J��l'�ߓ��~Nh�$"���J���~��.ϟRh�Ɂ����S��p�[���LW���;����K�t}y���;y�~�f{{u�Pl-����ӊ~IVʻ�I}I���Ǘ���,c8%6����V�Ѓ���+M��+�% ��՗���o/ϯ<JP���UN�o�
D	b�_M����h�1��V7�G|������YjG=���y����"Y�Tq}�O���!E\���Ս�����������/l|y�      ,   u   x�}ι! ���¹G7z�Z���`W�x���p�o�:hʁvpԨ�s����D����=*�)����Y_��@�4<!F�t�9��ʵK�lg���N�4O#����[k_�@(      *   X   x���;@@ �z�z�φ����؉�
�w�}ъ,v�C�P�p�ɕ���abd"@�X�`%�FA��o�����ָ���6�?E�	      +   n   x���1� @�N�������$C����js�n_�4��Z!�%/ �D͘T5a��	� ��0�Lq�R80��y�77�m?�k�\Fox\���7������_�&!g     