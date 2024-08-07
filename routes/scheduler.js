const cron = require("node-cron");
const nodemailer = require("nodemailer");
const { User } = require("../models/user");
const { WeeklyExpense } = require("../models/weeklyExpense");
const { MonthlyExpense } = require("../models/monthlyExpense");
const { addWeeks, format, getISOWeek } = require("date-fns");
const email = "trackexpenses07@gmail.com";
const pass = process.env.password;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: email,
    pass: pass,
  },
});

cron.schedule(" 31 12 * * 0", async () => {
try {
     // Set the current date to midnight and calculate seven days ago
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const sevenDaysAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
     
     // Find open weekly expenses that are older than seven days
     const openExpenses = await WeeklyExpense.find({
       startdate: { $lte: sevenDaysAgo },
       isExpenseOpen: true,
     });
   
     // Keep track of users who have already been emailed
     const emailedUsers = new Set();
   
     for (const ex of openExpenses) {
       const userId = ex.User.toString();
   
        // Check if this user has already been emailed
       if (!emailedUsers.has(userId)) {
           // Find the user in the database
         const user = await User.findById({ _id: ex.User });
         if (user) {
           const emailOptions = {
             from: '"Track Your Expenses" <trackexpenses07@gmail.com>',
             to: user.email,
             subject: "📊 Please Update Your Expenses 💰",
             html: `
                   <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                   <h2 style="color: #5c6bc0; text-align: center; margin-top: 0;">Hi ${user.name},</h2>
                   <p style="font-size: 16px; text-align: center; margin: 20px 0;">💼 It's time to update the current amount of funds you have in your account. Please take a moment to do so.</p>
                   <p style="font-size: 16px; text-align: center; margin: 20px 0;">Best regards,<br>Track Expenses Team 😊</p>
                   <div style="text-align: center; margin-top: 30px;">
                   <a href="https://track-expenses-3run.vercel.app/login" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #5c6bc0; text-decoration: none; border-radius: 5px;">Click here</a>
                   <p style="margin: 10px 0 0;">to go to your account</p>
                   </div>
                   </div>
   
                 `,
             text: `Hi ${user.name},\n\n💼 It's time to update the current amount of funds you have in your account. Please take a moment to do so.\n\nBest regards,\nTrack Expenses Team 😊`,
           };
           try {
             await transporter.sendMail(emailOptions);
             emailedUsers.add(userId);
           } catch (error) {
             const failed = {
               from: email,
               to: "trackexpenses08@gmail.com",
               subject: "Reminder failed",
               text: `Hi dev, debug your code, reminder function failed <error message>: "${error.message}"`,
             };
             try {
               await transporter.sendMail(failed);
               console.log("error sent:", error.message);
             } catch (failedError) {
               console.error("Failed to send error email:", failedError.message);
             }
           }
          
         }
       }
     }
} catch (error) {
  console.error("Error in cron job for reminder to record week amount:", error.message);
}
});

cron.schedule("3 19 * * 0", async () => {
  try {
    const currentWeek = getISOWeek(new Date());
    if (currentWeek % 2 === 0) {
      const currentMonth = new Date().getMonth() + 1;
      const monthexpense = await MonthlyExpense.find({
        $expr: {
          $ne: [{ $month: "$date" }, currentMonth],
        },
      });
      if (monthexpense.length > 0) {
        const emailedUsers = new Set();

        for (const expense of monthexpense) {
          const userId = expense.User.toString();
          if (!emailedUsers.has(userId)) {
            const user = await User.findById(expense.User);
            if (user) {
              const RecordThisMonthExpensemail = {
                from: '"Track Your Expense" <trackexpenses07@gmail.com>',
                to: user.email,
                subject: "Record your Expenses for this month",
                html: `
                  <div style="background-color: #E3F2FD; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                      <h2 style="color: #3f51b5; text-align: center;">Track Your Expense</h2>
                      <p>Hi ${user.name},</p>
                      <p>We noticed that you have not recorded your monthly expenses for this month. For a better experience, please take a short time today to record your fixed expenses for this month.</p>
                      <p style="text-align: center;">
                        <a href="https://track-expenses-3run.vercel.app/login" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #3f51b5; border-radius: 5px; text-decoration: none;">Click here to Log In</a>
                      </p>
                      <p>Best regards,<br/>Track Your Expense Team</p>
                    </div>
                  </div>
                `,
              };
              await transporter.sendMail(RecordThisMonthExpensemail);
              emailedUsers.add(userId);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});
