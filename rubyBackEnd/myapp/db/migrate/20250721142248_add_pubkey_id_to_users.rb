class AddPubkeyIdToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :pubkey_id, :string
  end
end
