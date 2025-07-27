class CreateUsers < ActiveRecord::Migration[7.0]
  def change
    create_table :users do |t|
      t.string   :username,              null: false
      t.datetime :timestamp,             null: false, default: -> { 'NOW()' }
      t.jsonb    :pubkey_coordinates,    null: false, default: {}

      t.timestamps
    end

    # add a GIN index so you can query into x/y fast
    add_index :users, :pubkey_coordinates, using: :gin
  end
end
