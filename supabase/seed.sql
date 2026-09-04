-- Seed dev (executar após criar usuário)

-- Inserir categorias padrão (após auth)
-- Exemplo: substituir auth.uid() por id do usuário dev

-- Categorias
-- insert into transaction_categories (user_id, name, icon, color) values (auth.uid(),'Alimentação','Utensils',''), ...

-- Contas internas
-- insert into accounts (user_id, name, icon, type, color, initial_balance) values
-- (auth.uid(),'Banco Inter','inter','checking','#FF6A00',0),
-- (auth.uid(),'Nubank','nubank','checking','#820AD1',0),
-- (auth.uid(),'Mercado Pago','mercadopago','wallet','#009EE3',0),
-- (auth.uid(),'Banco do Brasil','bb','checking','#FCFC30',0),
-- (auth.uid(),'Dinheiro','cash','cash','#22C55E',0);
